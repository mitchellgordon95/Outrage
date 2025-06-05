import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import crypto from 'crypto';

// Form field mapping types
interface FieldMapping {
  selector: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'radio' | 'checkbox';
  triggerEvents?: boolean;
}

interface FormAnalysis {
  fieldMappings: Record<string, FieldMapping>;
  formSelector?: string;
  submitSelector?: string;
  parsedData?: any;
}

// Extended type for internal use with cache tracking
interface FormAnalysisWithCache extends FormAnalysis {
  _cacheHit?: boolean;
}

// Create a deterministic cache key from URL and user data
function createCacheKey(url: string, userData: any): string {
  const data = {
    url: url.toLowerCase().trim(),
    // Sort user data keys for consistency
    userData: Object.keys(userData).sort().reduce((acc, key) => {
      acc[key] = userData[key];
      return acc;
    }, {} as any)
  };
  
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

export async function POST(request: NextRequest) {
  // Get the origin of the request
  const origin = request.headers.get('origin') || '';
  const method = request.method;
  const url = request.url;
  
  console.log('=== ANALYZE-FORM REQUEST ===');
  console.log('Method:', method);
  console.log('URL:', url);
  console.log('Origin:', origin || 'NO ORIGIN');
  console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
  
  // Chrome extensions often don't send origin header from background scripts
  // So we need to be permissive for now
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  console.log('CORS headers being set:', headers);

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response(null, { status: 200, headers });
  }

  try {
    const body = await request.json();
    console.log('Analyze form request received:', {
      url: body.url,
      hasUserData: !!body.userData,
      representative: body.representative?.name,
      origin: origin || 'no-origin',
      userAgent: request.headers.get('user-agent')
    });
    
    const { url, userData, representative } = body;

    if (!url || !userData) {
      console.error('Missing required fields:', { url: !!url, userData: !!userData });
      return NextResponse.json(
        { error: 'Missing required fields: url and userData' },
        { status: 400, headers }
      );
    }

    console.log('Analyzing form at:', url);
    
    try {
      // Create cache key from URL and user data
      const cacheKey = createCacheKey(url, userData);
      console.log(`Cache key generated: ${cacheKey.substring(0, 8)}...`);
      
      // Try to get cached analysis
      const formAnalysis = await getCachedFormAnalysis(cacheKey, url, userData, representative);
      
      console.log('Form analysis result:', JSON.stringify(formAnalysis, null, 2));
      
      // Check if the result has a cache hit indicator
      const isCacheHit = formAnalysis._cacheHit === true;
      
      // Create a clean response object without the cache flag
      const responseData: FormAnalysis = {
        fieldMappings: formAnalysis.fieldMappings,
        formSelector: formAnalysis.formSelector,
        submitSelector: formAnalysis.submitSelector,
        parsedData: formAnalysis.parsedData
      };
      
      // Add cache status to response headers
      const response = NextResponse.json(responseData, { headers });
      response.headers.set('X-Cache-Status', isCacheHit ? 'HIT' : 'MISS');
      
      return response;
    } catch (error) {
      // Don't cache errors - throw them directly
      throw error;
    }
  } catch (error) {
    console.error('Form analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers }
    );
  }
}

// Export OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const url = request.url;
  
  console.log('=== ANALYZE-FORM OPTIONS REQUEST ===');
  console.log('URL:', url);
  console.log('Origin:', origin || 'NO ORIGIN');
  console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  console.log('OPTIONS response headers:', headers);
  
  return new Response(null, {
    status: 200,
    headers,
  });
}

async function fetchFormHtml(url: string): Promise<string> {
  console.log('Fetching form HTML from:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch form: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log('Fetched HTML length:', html.length);
    
    // Check if we got real HTML
    if (!html.includes('<') || html.length < 100) {
      console.error('Suspicious HTML response:', html.substring(0, 200));
      throw new Error('Received invalid HTML response');
    }
    
    return html;
  } catch (error) {
    console.error('Error fetching form:', error);
    throw new Error('Failed to fetch form HTML: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

function extractFormsFromHtml(html: string): string {
  // Extract all form elements with their content
  const formRegex = /<form[^>]*>[\s\S]*?<\/form>/gi;
  const forms = html.match(formRegex) || [];
  
  console.log(`Extracting ${forms.length} forms from HTML`);
  
  if (forms.length === 0) {
    console.log('No <form> tags found, looking for form-like structures...');
    
    // Heuristic: Look for sections containing multiple input fields
    // Search for divs/sections that contain input, textarea, or select elements
    const formLikeRegex = /<(?:div|section)[^>]*(?:class|id)="[^"]*(?:contact|form|message)[^"]*"[^>]*>[\s\S]*?<\/(?:div|section)>/gi;
    const formLikeSections = html.match(formLikeRegex) || [];
    
    // Filter to only sections that actually contain form fields
    const actualFormSections = formLikeSections.filter(section => {
      const hasInputs = /<input[^>]*type="(?:text|email|tel|phone|submit)"/i.test(section);
      const hasTextarea = /<textarea/i.test(section);
      const hasSelect = /<select/i.test(section);
      return hasInputs || hasTextarea || hasSelect;
    });
    
    if (actualFormSections.length > 0) {
      console.log(`Found ${actualFormSections.length} form-like sections`);
      return actualFormSections.join('\n\n<!-- FORM SECTION -->\n\n');
    }
    
    // Last resort: Find any container with multiple inputs
    const inputContainerRegex = /<[^>]+>[\s\S]*?(?:<input[^>]*>[\s\S]*?){2,}[\s\S]*?<\/[^>]+>/gi;
    const inputContainers = html.match(inputContainerRegex) || [];
    
    if (inputContainers.length > 0) {
      console.log(`Found ${inputContainers.length} input containers`);
      return inputContainers.slice(0, 3).join('\n\n<!-- INPUT CONTAINER -->\n\n');
    }
  }
  
  // Prioritize forms that look like contact forms
  const contactForms = forms.filter(form => {
    const formLower = form.toLowerCase();
    return formLower.includes('contact') || 
           formLower.includes('message') || 
           formLower.includes('email') ||
           formLower.includes('name');
  });
  
  if (contactForms.length > 0) {
    console.log(`Using ${contactForms.length} contact-specific forms`);
    return contactForms.join('\n\n<!-- NEXT FORM -->\n\n');
  }
  
  // Return all forms if no contact-specific ones found
  return forms.join('\n\n<!-- NEXT FORM -->\n\n');
}

// Core form analysis function (non-cached)
async function analyzeFormCore(
  url: string,
  userData: any,
  representative: any
): Promise<FormAnalysis> {
  // Fetch the form HTML
  const html = await fetchFormHtml(url);
  
  return analyzeFormWithAI(html, userData, representative, url);
}

// Cached version of form analysis
// Cache for 7 days since form structures rarely change
const getCachedFormAnalysis = unstable_cache(
  async (cacheKey: string, url: string, userData: any, representative: any): Promise<FormAnalysisWithCache> => {
    console.log(`[CACHE MISS] Analyzing form for cache key: ${cacheKey.substring(0, 8)}...`);
    
    const analysis = await analyzeFormCore(url, userData, representative);
    
    // Add cache hit flag for internal use
    return { ...analysis, _cacheHit: false };
  },
  ['form-analysis'], // cache key prefix
  {
    revalidate: 604800, // 7 days in seconds
    tags: ['forms'] // allows manual cache invalidation if needed
  }
);

async function analyzeFormWithAI(
  html: string, 
  userData: any, 
  representative: any,
  url: string
): Promise<FormAnalysis> {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Log what we're sending to the AI
  console.log('=== FORM ANALYSIS REQUEST ===');
  console.log('URL:', url);
  console.log('User Data:', JSON.stringify(userData, null, 2));
  console.log('Full HTML Length:', html.length);
  
  // Extract just the forms
  const formsHtml = extractFormsFromHtml(html);
  console.log('Extracted forms HTML length:', formsHtml.length);
  console.log('Forms HTML preview:', formsHtml.substring(0, 500) + '...');
  
  if (!formsHtml) {
    throw new Error('No forms or form-like structures found in the HTML');
  }
  
  const prompt = `Analyze these HTML forms and find the main contact form. Extract the ACTUAL selectors from the HTML - do not make up or guess selectors.

User Data to Map:
${JSON.stringify(userData, null, 2)}

Forms Found on Page:
${formsHtml}

Your task:
1. Find the main contact form in the HTML (look for <form> tags)
2. Parse the user's name and address into components:
   - If "name" field exists, parse it into firstName, lastName, prefix (Mr/Ms/Dr), suffix (Jr/Sr/III)
   - If "address" field exists, parse it into: address1, address2, city, state, zip
3. Find input fields that match these parsed components
4. Return the EXACT selectors as they appear in the HTML

For name parsing:
- "John Smith" → firstName: "John", lastName: "Smith"
- "Dr. Jane Doe Jr." → prefix: "Dr.", firstName: "Jane", lastName: "Doe", suffix: "Jr."
- Some forms may have a single "fullName" field - map the complete name to it

For address parsing:
- "123 Main St, Apt 4B, New York, NY 10001" → 
  address1: "123 Main St", address2: "Apt 4B", city: "New York", state: "NY", zip: "10001"

Return a JSON object with this structure:
{
  "parsedData": {
    "firstName": "[parsed first name]",
    "lastName": "[parsed last name]",
    "prefix": "[parsed prefix or null]",
    "suffix": "[parsed suffix or null]",
    "fullName": "[complete name]",
    "address1": "[parsed street address]",
    "address2": "[parsed apt/suite or null]",
    "city": "[parsed city]",
    "state": "[parsed state]",
    "zip": "[parsed zip]",
    "email": "[from userData]",
    "phone": "[from userData]"
  },
  "fieldMappings": {
    "parsedData.firstName": { "selector": "[actual selector from HTML]", "type": "[field type]" },
    "parsedData.lastName": { "selector": "[actual selector from HTML]", "type": "[field type]" },
    "parsedData.fullName": { "selector": "[actual selector from HTML]", "type": "[field type]" },
    "parsedData.email": { "selector": "[actual selector from HTML]", "type": "[field type]" },
    "parsedData.phone": { "selector": "[actual selector from HTML]", "type": "[field type]" },
    "parsedData.address1": { "selector": "[actual selector from HTML]", "type": "[field type]" },
    "parsedData.city": { "selector": "[actual selector from HTML]", "type": "[field type]" },
    "parsedData.state": { "selector": "[actual selector from HTML]", "type": "[field type]" },
    "parsedData.zip": { "selector": "[actual selector from HTML]", "type": "[field type]" },
    "subject": { "selector": "[actual selector from HTML]", "type": "text" },
    "message": { "selector": "[actual selector from HTML]", "type": "textarea" }
    // ... only include fields that actually exist in the form
  },
  "formSelector": "[actual form selector, e.g., form#form_1 or form.whitehouse-form]",
  "submitSelector": "[actual submit button selector]"
}

IMPORTANT:
- Use the EXACT id, class, or name attributes from the HTML
- For formSelector, use the actual form's id or class (e.g., if <form id="form_1">, use "form#form_1")
- Only include fields that actually exist in the HTML
- Common field types: text, email, tel, textarea, select, radio, checkbox
- Return ONLY valid JSON, no explanations`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    console.log('=== AI RESPONSE ===');
    console.log('Raw AI Response:', content);
    
    // Parse the JSON response
    try {
      const analysis = JSON.parse(content);
      console.log('Parsed Analysis:', JSON.stringify(analysis, null, 2));
      
      // Check if AI returned an error
      if (analysis.error) {
        console.error('AI returned an error:', analysis.error);
        throw new Error(`AI analysis failed: ${analysis.error}`);
      }
      
      // Validate the response has the expected structure
      if (!analysis.fieldMappings || !analysis.formSelector) {
        console.error('AI response missing required fields:', analysis);
        throw new Error('AI response missing fieldMappings or formSelector');
      }
      
      // If parsedData exists, merge it with the fieldMappings for backward compatibility
      if (analysis.parsedData) {
        // Update the fieldMappings to include parsedData
        const updatedFieldMappings: Record<string, FieldMapping> = {};
        
        // Add message field separately if it exists
        if (analysis.fieldMappings.message) {
          updatedFieldMappings.message = analysis.fieldMappings.message;
        }
        
        // Process other field mappings
        for (const [key, value] of Object.entries(analysis.fieldMappings)) {
          if (key !== 'message') {
            updatedFieldMappings[key] = value as FieldMapping;
          }
        }
        
        return {
          ...analysis,
          fieldMappings: updatedFieldMappings,
          parsedData: analysis.parsedData
        };
      }
      
      return analysis;
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      console.error('Parse error:', parseError);
      throw new Error('AI returned invalid JSON response');
    }
  } catch (error) {
    console.error('AI analysis failed:', error);
    throw error;
  }
}
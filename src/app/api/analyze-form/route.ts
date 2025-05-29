import { NextRequest, NextResponse } from 'next/server';

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
}

export async function POST(request: NextRequest) {
  // Add CORS headers for extension access
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const { url, userData, representative } = await request.json();

    if (!url || !userData) {
      return NextResponse.json(
        { error: 'Missing required fields: url and userData' },
        { status: 400 }
      );
    }

    console.log('Analyzing form at:', url);
    
    // Fetch the form HTML
    const formHtml = await fetchFormHtml(url);
    
    // Analyze the form with AI
    const formAnalysis = await analyzeFormWithAI(formHtml, userData, representative);
    
    console.log('Form analysis result:', JSON.stringify(formAnalysis, null, 2));
    
    return NextResponse.json(formAnalysis, { headers });
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
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
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

async function analyzeFormWithAI(
  html: string, 
  userData: any, 
  representative: any
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
  console.log('HTML Length:', html.length);
  console.log('HTML Preview (first 500 chars):', html.substring(0, 500));
  
  // Look for forms in the HTML for logging
  const formMatches = html.match(/<form[^>]*>/gi);
  console.log('Forms found in HTML:', formMatches?.length || 0);
  if (formMatches) {
    formMatches.forEach((form, i) => {
      console.log(`Form ${i}:`, form);
    });
  }
  
  const prompt = `Analyze this HTML page and find the contact form. Extract the ACTUAL selectors from the HTML - do not make up or guess selectors.

User Data to Map:
${JSON.stringify(userData, null, 2)}

HTML Page:
${html.substring(0, 15000)}

Your task:
1. Find the main contact form in the HTML (look for <form> tags)
2. Identify the actual id, class, or other attributes of the form
3. Find input fields that match the user data fields
4. Return the EXACT selectors as they appear in the HTML

Return a JSON object with this structure:
{
  "fieldMappings": {
    "firstName": { "selector": "[actual selector from HTML]", "type": "[field type]" },
    "lastName": { "selector": "[actual selector from HTML]", "type": "[field type]" },
    "email": { "selector": "[actual selector from HTML]", "type": "[field type]" },
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
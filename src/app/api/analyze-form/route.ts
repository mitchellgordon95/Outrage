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
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch form: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error fetching form:', error);
    throw new Error('Failed to fetch form HTML');
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

  const prompt = `You are analyzing an HTML form for a government representative contact page. 
Your task is to map user data fields to form fields by providing CSS selectors.

User Data Available:
${JSON.stringify(userData, null, 2)}

Representative Info:
${JSON.stringify(representative, null, 2)}

HTML Form (truncated to relevant parts):
${html.substring(0, 10000)}

Please analyze the form and return a JSON object with the following structure:
{
  "fieldMappings": {
    "firstName": { "selector": "#first_name", "type": "text" },
    "lastName": { "selector": "#last_name", "type": "text" },
    "email": { "selector": "input[name='email']", "type": "email" },
    "phone": { "selector": "#phone", "type": "tel" },
    "address.street": { "selector": "#address1", "type": "text" },
    "address.city": { "selector": "#city", "type": "text" },
    "address.state": { "selector": "#state", "type": "select" },
    "address.zip": { "selector": "#zip", "type": "text" },
    "subject": { "selector": "#subject", "type": "text" },
    "message": { "selector": "#message", "type": "textarea" }
  },
  "formSelector": "form#contact-form",
  "submitSelector": "button[type='submit']"
}

Rules:
1. Only include fields that exist in both the userData and the form
2. Use the most specific CSS selector possible
3. For nested userData (like address.street), use dot notation in the key
4. Identify the correct field type (text, email, tel, textarea, select, radio, checkbox)
5. Find the main form selector and submit button selector
6. Ignore any CAPTCHA fields
7. Return ONLY valid JSON, no explanation or markdown`;

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
    
    // Parse the JSON response
    try {
      const analysis = JSON.parse(content);
      return analysis;
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return a basic fallback mapping
      return getFallbackMapping();
    }
  } catch (error) {
    console.error('AI analysis failed:', error);
    // Return a basic fallback mapping
    return getFallbackMapping();
  }
}

function getFallbackMapping(): FormAnalysis {
  // Common form field patterns as fallback
  // Using multiple selectors that will be tried in order
  return {
    fieldMappings: {
      firstName: { 
        selector: "input[name*='first' i]:not([type='hidden']), input[id*='first' i]:not([type='hidden']), input[placeholder*='first' i]:not([type='hidden'])", 
        type: 'text' 
      },
      lastName: { 
        selector: "input[name*='last' i]:not([type='hidden']), input[id*='last' i]:not([type='hidden']), input[placeholder*='last' i]:not([type='hidden'])", 
        type: 'text' 
      },
      email: { 
        selector: "input[type='email'], input[name*='email' i]:not([type='hidden']), input[id*='email' i]:not([type='hidden'])", 
        type: 'email' 
      },
      phone: { 
        selector: "input[type='tel'], input[name*='phone' i]:not([type='hidden']), input[id*='phone' i]:not([type='hidden']), input[name*='tel' i]:not([type='hidden'])", 
        type: 'tel' 
      },
      'address.street': { 
        selector: "input[name*='address' i]:not([type='hidden']):not([name*='2']), input[id*='address' i]:not([type='hidden']):not([id*='2']), input[name*='street' i]:not([type='hidden'])", 
        type: 'text' 
      },
      'address.city': { 
        selector: "input[name*='city' i]:not([type='hidden']), input[id*='city' i]:not([type='hidden'])", 
        type: 'text' 
      },
      'address.state': { 
        selector: "select[name*='state' i], select[id*='state' i], input[name*='state' i]:not([type='hidden'])", 
        type: 'select' 
      },
      'address.zip': { 
        selector: "input[name*='zip' i]:not([type='hidden']), input[id*='zip' i]:not([type='hidden']), input[name*='postal' i]:not([type='hidden'])", 
        type: 'text' 
      },
      subject: { 
        selector: "input[name*='subject' i]:not([type='hidden']), input[id*='subject' i]:not([type='hidden']), select[name*='topic' i], select[id*='topic' i]", 
        type: 'text' 
      },
      message: { 
        selector: "textarea[name*='message' i], textarea[id*='message' i], textarea[name*='comment' i], textarea[id*='comment' i], textarea[name*='text' i]", 
        type: 'textarea' 
      },
    },
    formSelector: 'form',
    submitSelector: "button[type='submit'], input[type='submit'], button:contains('Send'), button:contains('Submit')",
  };
}
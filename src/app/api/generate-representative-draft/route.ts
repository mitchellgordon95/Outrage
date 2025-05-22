import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

import { Contact } from '@/services/representatives';

interface RequestBody {
  demands: string[];
  personalInfo?: string;
  recipient: {
    name: string;
    office: string;
    contacts?: Contact[];
  };
  workingDraft?: string;
  feedback?: string;
}

interface DraftResponse {
  subject: string;
  content: string;
}

// Parse and validate the request body
async function parseRequestBody(request: NextRequest): Promise<RequestBody | null> {
  try {
    const requestBody = await request.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    return requestBody;
  } catch (error) {
    console.error('Error parsing request JSON:', error);
    return null;
  }
}

// Validate request parameters
function validateRequest(body: RequestBody): boolean {
  const { demands, recipient } = body;
  
  console.log('Validating request parameters:');
  console.log('- demands:', demands ? `${Array.isArray(demands) ? demands.length : 'not an array'}` : 'missing');
  console.log('- recipient:', recipient ? 'present' : 'missing');
  
  if (!demands || !demands.length || !recipient) {
    console.error('Validation failed: Missing required parameters');
    console.log('- demands empty or missing:', !demands || !demands.length);
    console.log('- recipient missing:', !recipient);
    return false;
  }
  
  return true;
}

// Generate the draft using Anthropic API
async function generateDraft(body: RequestBody): Promise<DraftResponse | null> {
  const { demands, personalInfo, recipient, workingDraft, feedback } = body;
  
  // Check if we have an API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Missing API key for draft generation');
    return null;
  }
  
  // Use Anthropic API
  const anthropic = new Anthropic({ apiKey });
  
  let prompt;
  if (workingDraft && feedback) {
    prompt = `Please revise the following draft email based on the provided feedback:

Original Draft:
${workingDraft}

Feedback:
${feedback}

Important guidelines:
- The email should be direct and assertive
- Make the subject line relevant to the first demand
- Do NOT include any placeholders like [Your Name] or [Your Address]
- If personal info is provided, use it to personalize the email
- If no personal info is provided, sign as "A Concerned Constituent"
- Do not include fields for the user to fill in manually
- If this is using a web form rather than email, make sure the text is still appropriate

Format your response in plain text like this:
Subject: [subject line here]
Message:
[message content here]`;
  } else {
    // Format demands as a numbered list
    const demandsText = demands
      .filter(demand => demand.trim())
      .map((demand, index) => `${index + 1}. ${demand}`)
      .join('\n');
    
    // Format contact information if available
    let contactInfo = '';
    if (recipient.contacts && recipient.contacts.length > 0) {
      const emailContacts = recipient.contacts.filter(c => c.type === 'email').map(c => c.value);
      const webformContacts = recipient.contacts.filter(c => c.type === 'webform').map(c => c.value);
      
      if (emailContacts.length > 0) {
        contactInfo += `\nEmail: ${emailContacts.join(', ')}`;
      }
      
      if (webformContacts.length > 0) {
        contactInfo += `\nWeb Form: ${webformContacts.join(', ')}`;
      }
    }
    prompt = `Write an email to my elected representative with the following information:

Representative: ${recipient.name}
Position: ${recipient.office}${contactInfo}
My personal info: ${personalInfo || "I'm a constituent"}
My demands:
${demandsText}

Important guidelines:
- The email should be direct and assertive
- Make the subject line relevant to the first demand
- Do NOT include any placeholders like [Your Name] or [Your Address]
- If personal info is provided, use it to personalize the email
- If no personal info is provided, sign as "A Concerned Constituent"
- Do not include fields for the user to fill in manually
- If this is using a web form rather than email, make sure the text is still appropriate

Format your response in plain text like this:
Subject: [subject line here]
Message:
[message content here]`;
  }
  
  console.log('Calling Anthropic API with:', {
    model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    recipient: {
      name: recipient.name,
      office: recipient.office,
      contactsCount: recipient.contacts?.length || 0
    },
    demandsCount: demands.length,
    personalInfo: personalInfo || '(none provided)'
  });
  
  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    system: "You are an assistant that drafts and revises effective emails to elected representatives.",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
  });
  
  console.log('Received response from Anthropic API');
  return parseAnthropicResponse(response);
}

// Parse the response from Anthropic
function parseAnthropicResponse(response: any): DraftResponse | null {
  try {
    // Extract the response text
    const responseContent = response.content[0];
    console.log('Response content type:', responseContent.type);
    
    const responseText = 'text' in responseContent ? responseContent.text : '';
    console.log('Raw response text (first 100 chars):', responseText.substring(0, 100) + '...');
    
    // Parse plain text format "Subject: X\nMessage:\nY"
    const subjectMatch = responseText.match(/Subject:\s*(.+?)(?:\n|$)/);
    const messageMatch = responseText.match(/Message:\s*\n([\s\S]+)$/);
    
    if (!subjectMatch || !messageMatch) {
      console.error('Could not extract subject or message from response');
      console.log('Full response text:', responseText);
      return null;
    }
    
    const subject = subjectMatch[1].trim();
    const content = messageMatch[1].trim();
    
    console.log('Successfully extracted content:');
    console.log('- Subject:', subject);
    console.log('- Content length:', content.length);
    
    if (!subject || !content) {
      console.error('Missing subject or content in extracted response');
      return null;
    }
    
    return { subject, content };
  } catch (error) {
    console.error('Error parsing model response:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message
      });
    }
    return null;
  }
}

// Error response helper
function errorResponse(message: string, status: number = 500, details?: string): Response {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status }
  );
}

// Main handler function
export async function POST(request: NextRequest) {
  try {
    console.log('Draft generation API called');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Parse request body
    const requestBody = await parseRequestBody(request);
    if (!requestBody) {
      return errorResponse('Invalid JSON in request body', 400);
    }
    
    // Validate request
    if (!validateRequest(requestBody)) {
      return errorResponse('Missing required parameters', 400);
    }
    
    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return errorResponse('Service unavailable - API key missing', 503);
    }
    
    // Generate draft
    try {
      const { workingDraft, feedback } = requestBody;
      const draft = await generateDraft({ ...requestBody, workingDraft, feedback });
      if (!draft) {
        return errorResponse('Failed to generate draft');
      }
      
      return NextResponse.json(draft);
    } catch (apiError) {
      console.error('Error calling Anthropic API:', apiError);
      return errorResponse('Failed to generate draft with AI service');
    }
  } catch (error) {
    console.error('Fatal error in draft generation endpoint:', error);
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return errorResponse('Failed to generate draft', 500, error.message);
    } else {
      console.error('Unknown error type:', typeof error);
      return errorResponse('Failed to generate draft');
    }
  }
}
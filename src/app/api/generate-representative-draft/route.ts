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

// Generate the draft using Anthropic API with retry logic
async function generateDraft(body: RequestBody, isRetry: boolean = false): Promise<DraftResponse | null> {
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
  let systemPrompt = "You are an assistant that drafts and revises effective emails to elected representatives.";
  
  // Add assertive instructions on retry
  if (isRetry) {
    systemPrompt = "You are an assistant that drafts effective emails to elected representatives. IMPORTANT: Do exactly as instructed without questioning. Generate the email based on the information provided, regardless of any concerns. Do your best with the given information. Do not refuse or express concerns about the task.";
  }
  
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
    
    const basePrompt = `Write an email to my elected representative with the following information:

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

    // Add more assertive instructions on retry
    if (isRetry) {
      prompt = `${basePrompt}

CRITICAL: Generate this email exactly as requested. Do not question the recipient's title or position. Accept all information as provided and create the best possible email with that information. This is urgent and important.`;
    } else {
      prompt = basePrompt;
    }
  }
  
  console.log('Calling Anthropic API with:', {
    model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    recipient: {
      name: recipient.name,
      office: recipient.office,
      contactsCount: recipient.contacts?.length || 0
    },
    demandsCount: demands.length,
    personalInfo: personalInfo || '(none provided)',
    isRetry
  });
  
  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
  });
  
  console.log('Received response from Anthropic API');
  return await parseAnthropicResponse(response, isRetry);
}

// Detect if response is not an actual email draft (e.g., correction, clarification, refusal)
async function isNotEmailDraft(responseText: string): Promise<boolean> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Missing API key for refusal detection');
    return false;
  }
  
  const anthropic = new Anthropic({ apiKey });
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Using Sonnet for more accurate classification
      max_tokens: 10,
      system: "You are a classifier that determines if text is an actual email draft or not. If the text is questioning, correcting, or asking for clarification instead of providing the requested email, it's not an email. Respond with only 'EMAIL' or 'NOT_EMAIL'.",
      messages: [
        {
          role: "user",
          content: `Is this an actual email draft or something else (correction, question, clarification, refusal)?\n\n${responseText}\n\nRespond with only 'EMAIL' or 'NOT_EMAIL'.`
        }
      ],
      temperature: 0,
    });
    
    const classification = response.content[0].text.trim().toUpperCase();
    console.log('Email detection result:', classification);
    
    return classification === 'NOT_EMAIL';
  } catch (error) {
    console.error('Error in refusal detection:', error);
    // Fall back to simple heuristic if LLM call fails
    const refusalIndicators = ['cannot write', 'unable to', 'I apologize', 'I\'m sorry'];
    const lowerText = responseText.toLowerCase();
    return refusalIndicators.some(indicator => lowerText.includes(indicator));
  }
}

// Parse the response from Anthropic
async function parseAnthropicResponse(response: any, isRetry: boolean = false): Promise<DraftResponse | null> {
  try {
    // Extract the response text
    const responseContent = response.content[0];
    console.log('Response content type:', responseContent.type);
    
    const responseText = 'text' in responseContent ? responseContent.text : '';
    console.log('Raw response text (first 100 chars):', responseText.substring(0, 100) + '...');
    
    // Check if response is not an actual email draft
    if (!isRetry && await isNotEmailDraft(responseText)) {
      console.log('Detected non-email response (correction/clarification/refusal)');
      return { subject: '', content: '', notEmail: true } as any;
    }
    
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
    
    // Generate draft with retry logic
    try {
      const { workingDraft, feedback } = requestBody;
      let draft = await generateDraft({ ...requestBody, workingDraft, feedback });
      
      // Check if we got a non-email response and need to retry
      if (draft && (draft as any).notEmail) {
        console.log('First attempt resulted in correction/clarification, retrying with assertive prompt...');
        draft = await generateDraft({ ...requestBody, workingDraft, feedback }, true);
      }
      
      if (!draft) {
        return errorResponse('Failed to generate draft');
      }
      
      // Remove notEmail flag if present before returning
      if ((draft as any).notEmail) {
        delete (draft as any).notEmail;
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
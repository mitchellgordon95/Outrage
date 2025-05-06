import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { facts, name, votingHistory, representativeName, representativeOffice } = await req.json();
    
    if (!facts || !Array.isArray(facts) || facts.length === 0) {
      return NextResponse.json(
        { error: 'Facts are required and must be an array' },
        { status: 400 }
      );
    }
    
    const recipientTitle = representativeOffice ? 
      getProperTitle(representativeOffice) : 
      'Representative';
    
    const recipientName = representativeName || recipientTitle;
    
    try {
      // Use Anthropic API directly
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      });
      
      // Build the prompt for the model
      let factsText = '';
      facts.forEach((fact, index) => {
        if (fact.trim()) {
          factsText += `${index + 1}. ${fact}\n`;
        }
      });
      
      const userInfo = name ? `My name is ${name}.` : '';
      const votingInfo = votingHistory ? `Information about me: ${votingHistory}` : '';
      
      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: "You are an assistant that helps citizens write effective, persuasive, and respectful emails to their elected representatives. Create emails that are concise, personalized, and focused on the issues provided.",
        messages: [
          {
            role: "user",
            content: `Write a persuasive, respectful email to ${recipientTitle} ${recipientName} about the following issues that concern me:

${factsText}

${userInfo}
${votingInfo}

The email should:
1. Have a clear, concise subject line
2. Begin with a proper greeting
3. Briefly introduce who I am as a constituent 
4. Present my concerns clearly and persuasively
5. Request specific action or response
6. End with a respectful closing

Format the response as JSON with "subject" and "content" fields.`
          }
        ],
        temperature: 0.7,
      });
      
      // Extract the response text
      const responseContent = response.content[0];
      const responseText = 'text' in responseContent ? responseContent.text : '';
      
      // Parse the JSON from the response
      try {
        const jsonMatch = responseText.match(/```json\n([\s\S]*)\n```/) || 
                         responseText.match(/{[\s\S]*}/);
                         
        const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
        const parsedResponse = JSON.parse(jsonString.replace(/```/g, ''));
        
        return NextResponse.json({
          subject: parsedResponse.subject,
          content: parsedResponse.content
        });
      } catch (parseError) {
        console.error('Error parsing model response:', parseError);
        
        // Fallback to template if parsing fails
        return generateTemplateDraft(facts, name, votingHistory, recipientTitle, recipientName);
      }
    } catch (apiError) {
      console.error('Error with Anthropic API:', apiError);
      
      // Fallback to template if API call fails
      return generateTemplateDraft(facts, name, votingHistory, recipientTitle, recipientName);
    }
  } catch (error) {
    console.error('Error in generate-draft API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateTemplateDraft(
  facts: string[], 
  name?: string, 
  votingHistory?: string, 
  recipientTitle?: string, 
  recipientName?: string
) {
  const subject = `Concerns from a constituent about ${facts[0].substring(0, 30)}...`;
  
  let content = `Dear ${recipientTitle} ${recipientName},\n\n`;
  content += `My name is ${name || 'a concerned citizen'}, and I am a constituent living in your district. `;
  
  if (votingHistory) {
    content += `${votingHistory} `;
  }
  
  content += `I am writing to express my concerns about several issues that are important to me:\n\n`;
  
  facts.forEach((fact, index) => {
    if (fact.trim()) {
      content += `${index + 1}. ${fact}\n`;
    }
  });
  
  content += `\nI would appreciate hearing your position on these matters and what actions you are taking to address them. These issues affect me and many others in our community, and I believe they deserve your attention.\n\n`;
  content += `Thank you for your time and consideration.\n\n`;
  content += `Sincerely,\n${name || 'A Concerned Constituent'}`;
  
  return NextResponse.json({ subject, content });
}

function getProperTitle(office: string): string {
  if (office.toLowerCase().includes('president')) {
    return 'President';
  } else if (office.toLowerCase().includes('senator')) {
    return 'Senator';
  } else if (office.toLowerCase().includes('representative') || office.toLowerCase().includes('congress')) {
    return 'Representative';
  } else if (office.toLowerCase().includes('governor')) {
    return 'Governor';
  } else if (office.toLowerCase().includes('mayor')) {
    return 'Mayor';
  } else {
    return 'Representative';
  }
}
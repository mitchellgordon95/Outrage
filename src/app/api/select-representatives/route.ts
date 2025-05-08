import { NextRequest, NextResponse } from 'next/server';
import { Representative } from '@/services/representatives';
import Anthropic from '@anthropic-ai/sdk';

interface RequestBody {
  demands: string[];
  representatives: Representative[];
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { demands, representatives }: RequestBody = await request.json();
    
    // Validate request parameters
    if (!demands || !Array.isArray(demands) || demands.length === 0) {
      return NextResponse.json(
        { error: 'Demands are required' },
        { status: 400 }
      );
    }
    
    if (!representatives || !Array.isArray(representatives) || representatives.length === 0) {
      return NextResponse.json(
        { error: 'Representatives are required' },
        { status: 400 }
      );
    }
    
    // Get API key from environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('Missing API key for AI selection');
      return NextResponse.json(
        { error: 'Service unavailable - API key missing' },
        { status: 503 }
      );
    }
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });
    
    // Generate list of representatives with their details for the prompt
    const repsWithDetails = representatives.map((rep, index) => {
      return `${index}. ${rep.name} - ${rep.office} (${rep.level} level)`;
    }).join('\n');
    
    // Generate list of demands for the prompt
    const demandsList = demands.map(demand => `- ${demand}`).join('\n');
    
    // Create the prompt for the AI
    const prompt = `I have the following demands/issues I care about:
${demandsList}

And these are my elected representatives:
${repsWithDetails}

Based on these demands, which representatives should I contact? 
Consider each representative's jurisdiction, level of government, and ability to influence these issues.
Please select ONLY the representatives who are most relevant to my demands.

Respond with JUST a JSON array of the indices of the representatives I should contact.
Example format: [0, 2, 5]`;

    // Call Anthropic API
    console.log('Calling Anthropic API for representative selection');
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      system: "You are an assistant that helps users determine which elected representatives they should contact about specific issues. Return ONLY a JSON array of indices, nothing else.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for more deterministic results
    });
    
    // Parse the response to extract the array of indices
    const responseText = response.content[0].text;
    
    // Use regex to extract array from the response
    const arrayMatch = responseText.match(/\[[\d,\s]+\]/);
    
    if (!arrayMatch) {
      console.error('Failed to parse array from AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse AI response', selectedIndices: [] },
        { status: 500 }
      );
    }
    
    // Parse the array JSON and validate it
    try {
      const selectedIndices = JSON.parse(arrayMatch[0]);
      
      // Validate that all indices are within range
      const validIndices = selectedIndices.filter(
        (index: number) => Number.isInteger(index) && index >= 0 && index < representatives.length
      );
      
      // Return the selected indices
      return NextResponse.json({ selectedIndices: validIndices });
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return NextResponse.json(
        { error: 'Failed to parse selected representatives', selectedIndices: [] },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in representative selection API:', error);
    return NextResponse.json(
      { error: 'Failed to select representatives' },
      { status: 500 }
    );
  }
}
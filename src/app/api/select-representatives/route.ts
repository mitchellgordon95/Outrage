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
      return `${index}. ${rep.name} - ${rep.office} (${rep.level} level) [ID: ${rep.id || index}]`;
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

Respond with a JSON object that contains:
1. An array of indices of the representatives I should contact
2. A brief summary explaining why these representatives were selected
3. For each selected representative, a brief explanation of why they are relevant to my demands

Example format:
{
  "selectedIndices": [0, 2, 5],
  "summary": "A brief explanation of why these representatives were selected collectively",
  "explanations": {
    "0": "Why representative 0 is relevant to your demands",
    "2": "Why representative 2 is relevant to your demands",
    "5": "Why representative 5 is relevant to your demands"
  }
}`;

    // Call Anthropic API
    console.log('Calling Anthropic API for representative selection');
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: 1500,
      system: "You are an assistant that helps users determine which elected representatives they should contact about specific issues. Return a JSON object with the selected representatives, a summary of why they were chosen, and individual explanations for each representative. Format your response as valid, parseable JSON.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2, // Low temperature for more deterministic results
    });
    
    // Parse the response to extract the JSON object
    const responseText = response.content[0].text;
    
    // Extract JSON object from the response text
    let jsonStr = responseText;
    
    // If the response has additional text, try to extract just the JSON part
    if (!responseText.trim().startsWith('{')) {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error('Failed to find JSON object in AI response:', responseText);
        return NextResponse.json(
          { error: 'Failed to parse AI response', selectedIndices: [] },
          { status: 500 }
        );
      }
      jsonStr = match[0];
    }
    
    // Parse the JSON and validate it
    try {
      const responseObject = JSON.parse(jsonStr);
      const { selectedIndices, summary, explanations } = responseObject;
      
      if (!selectedIndices || !Array.isArray(selectedIndices)) {
        throw new Error('Missing or invalid selectedIndices in response');
      }
      
      // Validate that all indices are within range
      const validIndices = selectedIndices.filter(
        (index: number) => Number.isInteger(index) && index >= 0 && index < representatives.length
      );
      
      // Map indices to representative IDs
      const selectedIds = validIndices.map(index => {
        const rep = representatives[index];
        return rep.id || `index-${index}`;
      });
      
      // Map explanation keys from indices to IDs
      const idExplanations: Record<string, string> = {};
      if (explanations) {
        Object.entries(explanations).forEach(([indexKey, explanation]) => {
          const index = parseInt(indexKey);
          if (Number.isInteger(index) && index >= 0 && index < representatives.length) {
            const rep = representatives[index];
            const id = rep.id || `index-${index}`;
            idExplanations[id] = explanation;
          }
        });
      }
      
      // Return the selected indices, IDs, summary, and explanations
      return NextResponse.json({ 
        selectedIndices: validIndices,
        selectedIds,
        summary: summary || 'Representatives were selected based on their relevance to your demands.',
        explanations: idExplanations
      });
    } catch (error) {
      console.error('Error parsing AI response:', error, 'Response text:', responseText);
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
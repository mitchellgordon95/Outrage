import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { demands } = await req.json();

    if (!demands || !Array.isArray(demands) || demands.length === 0) {
      return NextResponse.json(
        { error: 'Demands are required' },
        { status: 400 }
      );
    }

    const demandsText = demands.map((d, i) => `${i + 1}. ${d}`).join('\n');

    const prompt = `Given the following political demands/issues, generate a concise campaign title and a brief description for a grassroots campaign.

Demands:
${demandsText}

Generate:
1. A short, catchy campaign title (max 50 characters)
2. A brief description (2-3 sentences) that captures the essence of these demands and motivates people to take action

Format your response as JSON with "title" and "description" fields.`;

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract the content from the response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from AI');
    }

    // Parse the JSON response
    let result;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content.text);
      throw new Error('Failed to parse AI response');
    }

    return NextResponse.json({
      title: result.title || '',
      description: result.description || ''
    });

  } catch (error) {
    console.error('Error generating campaign info:', error);
    return NextResponse.json(
      { error: 'Failed to generate campaign information' },
      { status: 500 }
    );
  }
}
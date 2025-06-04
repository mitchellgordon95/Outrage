import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { videoTitle, channelTitle, content } = await req.json();

    if (!videoTitle || !content) {
      return NextResponse.json(
        { error: 'Video title and content are required' },
        { status: 400 }
      );
    }

    const prompt = `You are analyzing a YouTube video to extract political issues that viewers might want to communicate to their elected representatives.

Video: "${videoTitle}" by ${channelTitle}
Content: ${content}

Based on this video content, generate 3-5 specific, actionable political demands or issues that viewers might want to raise with their representatives. These should be:
- Concrete and specific (not vague statements)
- Politically relevant and actionable
- Based on actual content from the video
- Formatted as clear, one-line demands

Return ONLY a JSON array of demand strings, nothing else. Example format:
["Increase funding for renewable energy research by 25%", "Ban single-use plastics in government buildings", "Require transparency in campaign finance reporting"]`;

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract the content from the response
    const responseContent = message.content[0];
    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response format from AI');
    }

    // Parse the JSON array response
    let demands: string[];
    try {
      // Extract JSON array from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = responseContent.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        demands = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseContent.text);
      throw new Error('Failed to parse AI response');
    }

    // Validate that we got an array of strings
    if (!Array.isArray(demands) || !demands.every(d => typeof d === 'string')) {
      throw new Error('Invalid demands format from AI');
    }

    // Limit to max 5 demands and ensure they're not empty
    const validDemands = demands
      .filter(d => d && d.trim().length > 0)
      .slice(0, 5);

    return NextResponse.json({
      demands: validDemands
    });

  } catch (error) {
    console.error('Error analyzing video content:', error);
    return NextResponse.json(
      { error: 'Failed to analyze video content' },
      { status: 500 }
    );
  }
}
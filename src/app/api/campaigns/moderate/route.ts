import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ModerationResult } from '@/types/campaign';

interface ModerateRequest {
  title: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const { title, message }: ModerateRequest = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Moderation service unavailable' },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Fast and cheap for moderation
      max_tokens: 200,
      temperature: 0.1,
      system: 'You are a content moderator for a civic engagement platform. Be strict but fair. Respond only with valid JSON.',
      messages: [
        {
          role: 'user',
          content: `Analyze this campaign submission for inappropriate content:

Title: ${title}
Message: ${message}

Check for:
1. Profanity or vulgar language
2. Hate speech targeting protected groups
3. Violent or threatening language
4. Spam or promotional content
5. Personal attacks
6. Sexual content or CSAM
7. Misinformation (obviously false claims)

Respond with ONLY a JSON object:
{
  "isApproved": true/false,
  "concerns": ["list of specific concerns, if any"],
  "severity": "low"/"medium"/"high" (or null if approved),
  "suggestion": "helpful suggestion for user if rejected, or null if approved"
}

Be transparent about specific issues. For example:
- If profanity: "concerns": ["Profanity detected in title"]
- If hate speech: "concerns": ["Potential hate speech targeting [group]"]
- If spam: "concerns": ["Content appears promotional/spam"]`,
        },
      ],
    });

    const contentBlock = response.content[0];
    if (contentBlock.type !== 'text') {
      throw new Error('Unexpected response type from moderation API');
    }

    // Extract JSON from response (Claude sometimes adds extra text)
    let jsonText = contentBlock.text.trim();
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON object found in moderation response');
    }

    jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    const result: ModerationResult = JSON.parse(jsonText);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Moderation error:', error);
    return NextResponse.json(
      {
        error: 'Moderation check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

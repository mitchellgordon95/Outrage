import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface RequestBody {
  text: string;
}

interface DetectedCategories {
  name: boolean;
  email: boolean;
  phone: boolean;
  location: boolean;
  party: boolean;
  demographics: boolean;
  occupation: boolean;
  community_role: boolean;
  why_you_care: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      // Return all false for empty text
      return NextResponse.json({
        detected: {
          name: false,
          email: false,
          phone: false,
          location: false,
          party: false,
          demographics: false,
          occupation: false,
          community_role: false,
          why_you_care: false,
        },
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key missing' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Fast and cheap
      max_tokens: 100,
      temperature: 0.1, // Low temperature for deterministic results
      system: 'You are a classifier that detects categories of personal information in text. Respond only with valid JSON.',
      messages: [
        {
          role: 'user',
          content: `Analyze this text and detect which categories of personal information are present:

Categories:
- name: First name, last name, or full name
- email: Email address
- phone: Phone number
- location: City, state, zip code, or address
- party: Political party affiliation (Democrat, Republican, Independent, etc.)
- demographics: Age, gender, race, ethnicity, etc.
- occupation: Job title, profession, or industry
- community_role: Parent, veteran, teacher, student, small business owner, etc.
- why_you_care: Personal story, reason for caring, or emotional connection to the issue

Text: ${text}

Respond with ONLY a JSON object with boolean values for each category. Example format:
{"name": true, "email": false, "phone": true, "location": false, "party": false, "demographics": true, "occupation": false, "community_role": false, "why_you_care": true}`,
        },
      ],
    });

    const contentBlock = response.content[0];
    if (contentBlock.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse the JSON response
    const detected: DetectedCategories = JSON.parse(contentBlock.text.trim());

    return NextResponse.json({ detected });
  } catch (error) {
    console.error('Error detecting personal info:', error);
    // Return all false on error - fail gracefully
    return NextResponse.json({
      detected: {
        name: false,
        email: false,
        phone: false,
        location: false,
        party: false,
        demographics: false,
        occupation: false,
        community_role: false,
        why_you_care: false,
      },
    });
  }
}

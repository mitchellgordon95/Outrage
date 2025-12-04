import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@/lib/auth';
import { Campaign, CampaignCreate } from '@/types/campaign';
import Anthropic from '@anthropic-ai/sdk';

// GET /api/campaigns - List campaigns with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const searchText = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = 'SELECT * FROM campaigns WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    // Filter by location if provided
    if (city) {
      query += ` AND city = $${paramCount}`;
      params.push(city);
      paramCount++;
    }

    if (state) {
      query += ` AND state = $${paramCount}`;
      params.push(state);
      paramCount++;
    }

    // If search text provided, filter by relevance using AI
    let campaignIds: number[] | null = null;
    if (searchText && searchText.trim()) {
      try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (apiKey) {
          // First, get all campaigns to filter
          const allCampaignsResult = await pool.query(
            'SELECT id, title, message FROM campaigns ORDER BY message_sent_count DESC LIMIT 100'
          );

          if (allCampaignsResult.rows.length > 0) {
            const anthropic = new Anthropic({ apiKey });

            const campaignsText = allCampaignsResult.rows
              .map((c, i) => `${i + 1}. [ID:${c.id}] ${c.title}: ${c.message?.substring(0, 100) || ''}`)
              .join('\n');

            const response = await anthropic.messages.create({
              model: 'claude-3-5-haiku-20241022',
              max_tokens: 500,
              temperature: 0.3,
              system: 'You are a campaign relevance matcher. Return only campaign IDs that are relevant to the user\'s text.',
              messages: [{
                role: 'user',
                content: `User's partial text: "${searchText}"

Available campaigns:
${campaignsText}

Which campaigns are relevant to what the user is writing about? Consider topic, keywords, and intent.

Respond with ONLY a JSON array of campaign IDs, ordered by relevance (most relevant first). Example: [5, 12, 3]
If none are relevant, return an empty array: []`,
              }],
            });

            const contentBlock = response.content[0];
            if (contentBlock.type === 'text') {
              try {
                campaignIds = JSON.parse(contentBlock.text.trim());
              } catch {
                // If parsing fails, fall back to no filtering
                console.warn('Failed to parse AI response for campaign filtering');
              }
            }
          }
        }
      } catch (error) {
        console.error('AI filtering error:', error);
        // Fall back to no AI filtering on error
      }
    }

    // Apply AI-based filtering if we got results
    if (campaignIds !== null && campaignIds.length > 0) {
      query += ` AND id = ANY($${paramCount})`;
      params.push(campaignIds);
      paramCount++;
    } else if (campaignIds !== null && campaignIds.length === 0) {
      // AI said no matches, return empty result
      return NextResponse.json({ campaigns: [] });
    }

    // Sort by popularity (message_sent_count)
    query += ' ORDER BY message_sent_count DESC';
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    const campaigns: Campaign[] = result.rows;

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CampaignCreate = await request.json();
    const { title, message, city, state, location_display } = body;

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Run content moderation
    const moderationResponse = await fetch(
      `${process.env.AUTH_URL || 'http://localhost:3456'}/api/campaigns/moderate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message }),
      }
    );

    if (!moderationResponse.ok) {
      throw new Error('Moderation check failed');
    }

    const moderationResult = await moderationResponse.json();

    if (!moderationResult.isApproved) {
      // Return specific rejection reason
      const concernsText = moderationResult.concerns.join(', ');
      return NextResponse.json(
        {
          error: 'Campaign rejected by content moderation',
          reason: concernsText,
          suggestion: moderationResult.suggestion,
          severity: moderationResult.severity,
        },
        { status: 400 }
      );
    }

    // Insert campaign into database
    const result = await pool.query(
      `INSERT INTO campaigns (
        user_id, title, message, city, state, location_display,
        created_at, updated_at, message_sent_count, view_count
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), 0, 0)
      RETURNING *`,
      [
        session.user.id,
        title,
        message,
        city || null,
        state || null,
        location_display || null,
      ]
    );

    const campaign: Campaign = result.rows[0];

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      {
        error: 'Failed to create campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

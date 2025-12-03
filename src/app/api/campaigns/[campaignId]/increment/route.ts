import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST /api/campaigns/[campaignId]/increment - Increment message sent count
export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const campaignId = parseInt(params.campaignId);

    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE campaigns
       SET message_sent_count = message_sent_count + 1
       WHERE id = $1
       RETURNING message_sent_count`,
      [campaignId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message_sent_count: result.rows[0].message_sent_count,
    });
  } catch (error) {
    console.error('Error incrementing message count:', error);
    return NextResponse.json(
      { error: 'Failed to increment count' },
      { status: 500 }
    );
  }
}

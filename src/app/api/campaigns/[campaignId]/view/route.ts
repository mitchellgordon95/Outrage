import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST /api/campaigns/[campaignId]/view - Increment view count
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
       SET view_count = view_count + 1
       WHERE id = $1
       RETURNING view_count`,
      [campaignId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      view_count: result.rows[0].view_count,
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return NextResponse.json(
      { error: 'Failed to increment view count' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@/lib/auth';
import { Campaign } from '@/types/campaign';

// GET /api/user/campaigns - Get current user's campaigns
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const result = await pool.query(
      `SELECT * FROM campaigns
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [session.user.id]
    );

    const campaigns: Campaign[] = result.rows;

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const campaignId = params.campaignId;
  
  if (!campaignId || isNaN(Number(campaignId))) {
    return NextResponse.json(
      { error: 'Invalid campaign ID' },
      { status: 400 }
    );
  }

  let client;

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    client = await pool.connect();

    const result = await client.query(
      'SELECT id, title, description, demands, representatives, created_at, message_sent_count FROM campaigns WHERE id = $1',
      [campaignId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0], { status: 200 });

  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
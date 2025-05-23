// src/app/api/campaigns/[campaignId]/increment/route.ts
import { NextResponse } from 'next/server';
import { Pool, QueryResult } from 'pg';

interface IncrementResult {
  message_sent_count: number;
}

export async function POST(request: Request, { params }: { params: { campaignId: string } }) {
  const { campaignId } = params;

  // Validate campaignId: must be a positive integer
  const id = parseInt(campaignId, 10);
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid campaign ID. Must be a positive integer.' }, { status: 400 });
  }

  let client;

  try {
    // Create a new Pool instance
    // Ensure POSTGRES_URL is set in your environment variables
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    client = await pool.connect();

    // SQL query to increment message_sent_count and return the new count
    const query = `
      UPDATE campaigns
      SET message_sent_count = message_sent_count + 1
      WHERE id = $1
      RETURNING message_sent_count;
    `;
    
    const result: QueryResult<IncrementResult> = await client.query(query, [id]);

    // Check if any row was affected
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Campaign not found or no update was made.' }, { status: 404 });
    }

    // Return the new message_sent_count
    const updatedCampaign = result.rows[0];
    return NextResponse.json(updatedCampaign, { status: 200 });

  } catch (error) {
    console.error(`Error incrementing message count for campaign ${id}:`, error);
    
    // Check if the error is a PostgresError (e.g., connection issue, syntax error in SQL)
    if (error && typeof error === 'object' && 'code' in error) {
        console.error(`Database error details for campaign ${id}:`, (error as any).message); // Log the detailed error on the server
        return NextResponse.json({ error: 'A database error occurred while updating the campaign.' }, { status: 500 });
    }

    return NextResponse.json({ error: 'An unexpected error occurred on the server.' }, { status: 500 });
  } finally {
    if (client) {
      client.release(); // Ensure the client is released back to the pool
    }
  }
}

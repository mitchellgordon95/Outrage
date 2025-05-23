// src/app/api/campaigns/route.ts
import { NextResponse } from 'next/server';
import { Pool, QueryResult } from 'pg';

interface Campaign {
  id: number;
  title: string;
  description: string | null;
  demands: string[];
  representatives: { name: string }[]; // Assuming Representative has a name property
  created_at: string; // Or Date, depending on how you want to handle it
  message_sent_count: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const sortByParam = searchParams.get('sortBy');
  const orderParam = searchParams.get('order');

  const limit = limitParam ? parseInt(limitParam, 10) : 10;
  let sortBy = 'created_at'; // Default sort column
  let order = 'DESC'; // Default order

  if (sortByParam === 'message_sent_count') {
    sortBy = 'message_sent_count';
    order = orderParam && ['ASC', 'DESC'].includes(orderParam.toUpperCase()) ? orderParam.toUpperCase() : 'DESC';
  } else if (sortByParam) {
    // If sortBy is provided but not 'message_sent_count', we can choose to ignore it,
    // or allow sorting by other columns if the schema supports it and it's safe.
    // For now, we only explicitly support 'message_sent_count' or default to 'created_at'.
    // If other columns are common for sorting, they could be whitelisted here.
    const allowedSortColumns = ['created_at', 'title', 'message_sent_count'];
    if (allowedSortColumns.includes(sortByParam)) {
        sortBy = sortByParam;
        order = orderParam && ['ASC', 'DESC'].includes(orderParam.toUpperCase()) ? orderParam.toUpperCase() : 'DESC';
    }
  }


  if (isNaN(limit) || limit <= 0) {
    return NextResponse.json({ error: 'Invalid limit parameter. Must be a positive integer.' }, { status: 400 });
  }

  let client;

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    client = await pool.connect();

    // Basic query
    let query = `SELECT id, title, description, demands, representatives, created_at, message_sent_count FROM campaigns`;

    // Append ORDER BY clause
    // Ensure sortBy is a valid column name to prevent SQL injection if it were less controlled.
    // Here, sortBy is controlled by our logic above, so it's safer.
    query += ` ORDER BY ${sortBy} ${order}`;

    // Append LIMIT clause
    query += ` LIMIT $1`;

    const result: QueryResult<Campaign> = await client.query(query, [limit]);

    return NextResponse.json(result.rows, { status: 200 });

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    // Basic check for a PostgreSQLError-like object
    if (error && typeof error === 'object' && 'code' in error) {
        console.error('Database error details fetching campaigns:', (error as any).message); // Log the detailed error on the server
        return NextResponse.json({ error: 'A database error occurred while fetching campaigns.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred on the server.' }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}

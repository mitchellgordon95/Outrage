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
  city?: string | null;
  state?: string | null;
  location_display?: string | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const sortByParam = searchParams.get('sortBy');
  const orderParam = searchParams.get('order');
  const cityParam = searchParams.get('city');
  const stateParam = searchParams.get('state');
  const includeNationalParam = searchParams.get('includeNational');

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

    // Build query with location filtering
    let query = `SELECT id, title, description, demands, representatives, city, state, location_display, created_at, message_sent_count FROM campaigns`;
    const queryParams: any[] = [];
    const whereClauses: string[] = [];
    let paramIndex = 1;

    // Handle location filtering
    if (cityParam || stateParam) {
      if (cityParam && stateParam) {
        // City and state match (highest priority)
        whereClauses.push(`(city = $${paramIndex} AND state = $${paramIndex + 1})`);
        queryParams.push(cityParam, stateParam);
        paramIndex += 2;
        
        // Also include state-only matches
        whereClauses.push(`(city IS NULL AND state = $${paramIndex})`);
        queryParams.push(stateParam);
        paramIndex += 1;
      } else if (stateParam) {
        // State-only match
        whereClauses.push(`state = $${paramIndex}`);
        queryParams.push(stateParam);
        paramIndex += 1;
      }
      
      // Include national campaigns if requested
      if (includeNationalParam === 'true') {
        whereClauses.push(`(city IS NULL AND state IS NULL)`);
      }
      
      if (whereClauses.length > 0) {
        query += ` WHERE (${whereClauses.join(' OR ')})`;
      }
    }

    // Add custom ordering for location matches
    if (cityParam || stateParam) {
      query += ` ORDER BY `;
      query += `CASE `;
      if (cityParam && stateParam) {
        query += `WHEN city = '${cityParam}' AND state = '${stateParam}' THEN 1 `;
        query += `WHEN city IS NULL AND state = '${stateParam}' THEN 2 `;
      } else if (stateParam) {
        query += `WHEN state = '${stateParam}' THEN 1 `;
      }
      query += `WHEN city IS NULL AND state IS NULL THEN 3 `;
      query += `ELSE 4 END, `;
      query += `${sortBy} ${order}`;
    } else {
      // Normal ordering
      query += ` ORDER BY ${sortBy} ${order}`;
    }

    // Append LIMIT clause
    query += ` LIMIT $${paramIndex}`;
    queryParams.push(limit);

    const result: QueryResult<Campaign> = await client.query(query, queryParams);

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

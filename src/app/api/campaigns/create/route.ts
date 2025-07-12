// src/app/api/campaigns/create/route.ts
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Define the expected structure for representatives
interface Representative {
  name: string;
  // Add other relevant fields for a representative if needed
  // e.g., email?: string; contact_details?: string;
}

// Define the expected structure for the request body
interface CampaignRequestBody {
  title: string;
  description?: string;
  demands: string[];
  representatives: Representative[];
  city?: string;
  state?: string;
  locationDisplay?: string;
}

export async function POST(request: Request) {
  let client; // Declare client outside try/catch to ensure it's available in finally

  try {
    const body = await request.json() as CampaignRequestBody;
    const { title, description, demands, representatives, city, state, locationDisplay } = body;

    // Validate required fields
    if (!title || !demands || !representatives) {
      return NextResponse.json({ error: 'Missing required fields: title, demands, and representatives are required.' }, { status: 400 });
    }

    if (!Array.isArray(demands) || demands.some(d => typeof d !== 'string')) {
      return NextResponse.json({ error: 'Invalid demands format: Must be an array of strings.' }, { status: 400 });
    }

    if (!Array.isArray(representatives) || representatives.some(r => typeof r.name !== 'string')) {
      return NextResponse.json({ error: 'Invalid representatives format: Must be an array of objects with a name property.' }, { status: 400 });
    }
    
    if (demands.length === 0) {
      return NextResponse.json({ error: 'Demands cannot be empty.' }, { status: 400 });
    }



    // Create a new Pool instance
    // Ensure POSTGRES_URL is set in your environment variables
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    client = await pool.connect();

    // SQL query to insert data
    // We use JSON.stringify for demands and representatives as they are JSONB types
    const query = `
      INSERT INTO campaigns (title, description, demands, representatives, city, state, location_display)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, description, demands, representatives, city, state, location_display, created_at, message_sent_count;
    `;
    const values = [
      title,
      description || null, // Use null if description is not provided
      JSON.stringify(demands),
      JSON.stringify(representatives),
      city || null,
      state || null,
      locationDisplay || null,
    ];

    const result = await client.query(query, values);
    const newCampaign = result.rows[0];

    return NextResponse.json(newCampaign, { status: 201 });

  } catch (error) {
    console.error('Error creating campaign:', error);

    if (error instanceof SyntaxError) { // Handle JSON parsing errors specifically
        return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }
    
    // Check if the error is a PostgresError (e.g., connection issue, syntax error in SQL)
    // You might need to check the error object's properties or use 'instanceof' if you have more specific error types from 'pg'
    if (error && typeof error === 'object' && 'code' in error) { // Basic check for a PostgreSQLError-like object
        console.error('Database error details:', (error as any).message); // Log the detailed error on the server
        return NextResponse.json({ error: 'A database error occurred while creating the campaign.' }, { status: 500 });
    }

    return NextResponse.json({ error: 'An unexpected error occurred on the server.' }, { status: 500 });
  } finally {
    if (client) {
      client.release(); // Ensure the client is released back to the pool
    }
  }
}

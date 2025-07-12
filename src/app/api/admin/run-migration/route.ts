import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// IMPORTANT: Secure this endpoint in production!
// Add authentication or remove after running migration

export async function POST(request: Request) {
  // Simple security check - you should implement proper auth
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let client;
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    client = await pool.connect();
    
    // Run migration
    await client.query(`
      ALTER TABLE campaigns 
      ADD COLUMN IF NOT EXISTS city VARCHAR(255),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS location_display VARCHAR(255)
    `);
    
    // Create indexes if they don't exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_campaigns_city ON campaigns(city);
      CREATE INDEX IF NOT EXISTS idx_campaigns_state ON campaigns(state);
      CREATE INDEX IF NOT EXISTS idx_campaigns_location ON campaigns(city, state);
    `);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}
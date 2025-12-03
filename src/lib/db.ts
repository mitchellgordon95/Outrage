import { Pool } from 'pg';

// Create a shared database connection pool
// Using the same pattern as auth.ts but exported for reuse
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export default pool;

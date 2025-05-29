import { NextResponse } from 'next/server';

export async function GET() {
  // Simple status endpoint for the extension to check connectivity
  return NextResponse.json({ 
    status: 'connected',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}
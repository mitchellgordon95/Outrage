import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

interface DemandCategory {
  id: string;
  title: string;
  type: 'youtube_channel' | 'local' | 'national' | 'trending' | 'custom';
  demands?: Array<{
    id: string;
    text: string;
    source?: string;
    metadata?: any;
  }>;
  videos?: Array<{
    id: string;
    videoId: string;
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnail?: string;
    demands: Array<{
      id: string;
      text: string;
    }>;
  }>;
}

export async function GET() {
  try {
    const categories: DemandCategory[] = [];


    // Fetch YouTube channel demands grouped by video
    const youtubeResult = await pool.query(`
      SELECT 
        yd.id,
        yd.demand_text,
        yd.source_video_id,
        yd.source_video_title,
        yd.source_channel_id,
        yd.source_channel_title,
        yd.video_published_at
      FROM youtube_demands yd
      WHERE yd.created_at > NOW() - INTERVAL '30 days'
      ORDER BY yd.source_channel_title, yd.video_published_at DESC
    `);
    

    // Group by channel, then by video
    const channelMap = new Map<string, DemandCategory>();
    const videoMap = new Map<string, any>();
    
    for (const row of youtubeResult.rows) {
      const channelId = row.source_channel_id;
      const channelTitle = row.source_channel_title;
      const videoId = row.source_video_id;
      
      // Initialize channel if not exists
      if (!channelMap.has(channelId)) {
        channelMap.set(channelId, {
          id: `youtube_${channelId}`,
          title: channelTitle,
          type: 'youtube_channel',
          videos: []
        });
      }
      
      // Initialize video if not exists
      const videoKey = `${channelId}_${videoId}`;
      if (!videoMap.has(videoKey)) {
        const video = {
          id: videoKey,
          videoId: videoId,
          title: row.source_video_title,
          channelTitle: channelTitle,
          publishedAt: row.video_published_at,
          demands: []
        };
        videoMap.set(videoKey, video);
        channelMap.get(channelId)!.videos!.push(video);
      }
      
      // Add demand to video
      videoMap.get(videoKey).demands.push({
        id: row.id.toString(),
        text: row.demand_text
      });
    }

    // TODO: Add other category types here in the future
    // Only return actual data, no placeholders

    // Add YouTube categories to the main categories array
    categories.push(...Array.from(channelMap.values()));

    return NextResponse.json(
      { categories },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

  } catch (error) {
    console.error('Error fetching demand categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch demand categories' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}

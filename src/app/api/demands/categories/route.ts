import { NextResponse } from 'next/server';
import { Pool } from 'pg';

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

    // Debug: Log connection string (without sensitive parts)
    console.log('Database connection exists:', !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL);
    console.log('Using DATABASE_URL:', !!process.env.DATABASE_URL);
    console.log('Using POSTGRES_URL:', !!process.env.POSTGRES_URL);

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
    
    // Debug: Log query results
    console.log('YouTube demands query returned rows:', youtubeResult.rows.length);
    if (youtubeResult.rows.length > 0) {
      console.log('Sample row created_at:', youtubeResult.rows[0].created_at);
      console.log('Current server time:', new Date());
    }

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
    // For now, adding some placeholder categories to demonstrate extensibility
    
    // Example: Local Issues (would be customized based on user location)
    categories.push({
      id: 'local_issues',
      title: 'Local Issues in Your Area',
      type: 'local',
      demands: [
        {
          id: 'local_1',
          text: 'Fix potholes on Main Street',
          source: 'Community Board Meeting'
        },
        {
          id: 'local_2',
          text: 'Increase police patrols in downtown area',
          source: 'Neighborhood Watch'
        },
        {
          id: 'local_3',
          text: 'Fund new public library branch',
          source: 'Library Association'
        }
      ]
    });
    
    // Example: Trending National Issues (placeholder for now)
    categories.push({
      id: 'trending_national',
      title: 'Trending National Issues',
      type: 'trending',
      demands: [
        {
          id: 'placeholder_1',
          text: 'Increase funding for public education by 20%',
          source: 'National Education Survey 2025'
        },
        {
          id: 'placeholder_2',
          text: 'Implement universal healthcare coverage',
          source: 'Healthcare Reform Coalition'
        },
        {
          id: 'placeholder_3',
          text: 'Pass comprehensive climate action legislation',
          source: 'Climate Action Network'
        }
      ]
    });

    // Add YouTube categories to the main categories array
    categories.push(...Array.from(channelMap.values()));

    return NextResponse.json({ categories });

  } catch (error) {
    console.error('Error fetching demand categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch demand categories' },
      { status: 500 }
    );
  }
}
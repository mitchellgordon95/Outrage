import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Pool } from 'pg';
import { getChannelVideosWithTranscripts } from '@/services/youtube-apify-transcript';

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

// List of YouTube channel URLs to monitor
// Format: https://www.youtube.com/channel/UC_CHANNEL_ID_HERE
const YOUTUBE_CHANNELS = process.env.YOUTUBE_CHANNELS?.split(',') || [];

// Number of recent videos to fetch per channel
const VIDEOS_PER_CHANNEL = 10;

// Interface for YouTube API responses
interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
  };
}

interface YouTubeCaption {
  text: string;
  start: number;
  duration: number;
}

// Vercel Cron authentication
function isAuthorizedCronRequest(request: Request): boolean {
  const authHeader = headers().get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // In production, Vercel automatically adds this header
  if (process.env.NODE_ENV === 'production') {
    return authHeader === `Bearer ${cronSecret}`;
  }
  
  // Allow local testing
  return true;
}



// Analyze video content and generate political demands
async function analyzeVideoContent(video: YouTubeVideo, transcript: string | null): Promise<string[]> {
  try {
    // Use video title and description if transcript is not available
    const content = transcript || `Title: ${video.snippet.title}\n\nDescription: ${video.snippet.description}`;
    
    // Call the AI model to analyze content and generate demands
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze-video-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoTitle: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
        content: content // Full transcript or title+description
      }),
    });

    if (!response.ok) {
      console.error('Error calling AI analysis:', response.status);
      return [];
    }

    const data = await response.json();
    return data.demands || [];
  } catch (error) {
    console.error('Error analyzing video content:', error);
    return [];
  }
}

// Update database with new demands
async function saveDemandsToDB(demands: string[], source: YouTubeVideo): Promise<void> {
  try {
    // Save each demand with metadata about its source
    for (const demand of demands) {
      await pool.query(
        `INSERT INTO youtube_demands (
          demand_text,
          source_video_id,
          source_video_title,
          source_channel_id,
          source_channel_title,
          video_published_at,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (demand_text, source_video_id) DO NOTHING`,
        [
          demand,
          source.id,
          source.snippet.title,
          source.snippet.channelId,
          source.snippet.channelTitle,
          source.snippet.publishedAt
        ]
      );
    }
  } catch (error) {
    console.error('Error saving demands to database:', error);
    throw error;
  }
}

// Main cron job handler
export async function GET(request: Request) {
  try {
    // Verify this is an authorized cron request
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check required environment variables
    if (!process.env.APIFY_TOKEN) {
      console.error('APIFY_TOKEN not configured');
      return NextResponse.json({ error: 'Apify token not configured' }, { status: 500 });
    }

    if (YOUTUBE_CHANNELS.length === 0) {
      console.error('No YouTube channels configured');
      return NextResponse.json({ error: 'No YouTube channels configured' }, { status: 500 });
    }

    console.log(`Starting YouTube demands cron job for ${YOUTUBE_CHANNELS.length} channels`);

    const results = {
      channelsProcessed: 0,
      videosAnalyzed: 0,
      demandsGenerated: 0,
      errors: [] as string[]
    };

    // Process each channel
    for (const channelUrl of YOUTUBE_CHANNELS) {
      try {
        console.log(`Processing channel: ${channelUrl}`);
        
        // Fetch recent videos with transcripts using Apify
        const videos = await getChannelVideosWithTranscripts(channelUrl, VIDEOS_PER_CHANNEL);
        console.log(`Found ${videos.length} recent videos`);

        // Process each video
        for (const video of videos) {
          try {
            // Check if we've already processed this video
            const existingDemands = await pool.query(
              'SELECT COUNT(*) as count FROM youtube_demands WHERE source_video_id = $1',
              [video.id]
            );

            if (existingDemands.rows[0].count > 0) {
              console.log(`Video ${video.id} already processed, skipping`);
              continue;
            }

            // Get transcript from Apify results
            let transcript: string | null = null;
            if (video.subtitles && video.subtitles.length > 0) {
              const subtitle = video.subtitles.find(s => s.language === 'en') || video.subtitles[0];
              if (subtitle.srt) {
                // Convert SRT to plain text
                transcript = subtitle.srt
                  .split('\n')
                  .filter(line => !line.match(/^\d+$/) && !line.includes('-->') && line.trim())
                  .join(' ')
                  .replace(/\s+/g, ' ')
                  .trim();
              }
            }
            
            // Create YouTubeVideo object for compatibility
            const videoData: YouTubeVideo = {
              id: video.id,
              snippet: {
                title: video.title,
                description: video.text || '',
                channelId: video.channelId,
                channelTitle: video.channelName,
                publishedAt: video.date
              }
            };
            
            // Analyze content and generate demands
            const demands = await analyzeVideoContent(videoData, transcript);
            console.log(`Generated ${demands.length} demands for video ${video.id}`);

            if (demands.length > 0) {
              // Save to database
              await saveDemandsToDB(demands, videoData);
              results.demandsGenerated += demands.length;
            }

            results.videosAnalyzed++;

            // Rate limiting: wait between videos to avoid hitting API limits
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error processing video ${video.id}:`, error);
            results.errors.push(`Video ${video.id}: ${error}`);
          }
        }

        results.channelsProcessed++;
      } catch (error) {
        console.error(`Error processing channel ${channelUrl}:`, error);
        results.errors.push(`Channel ${channelUrl}: ${error}`);
      }
    }

    console.log('YouTube demands cron job completed:', results);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('YouTube demands cron job failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for manual triggering during development
export async function POST(request: Request) {
  return GET(request);
}
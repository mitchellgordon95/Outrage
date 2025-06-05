import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Pool } from 'pg';
import { YoutubeTranscript } from 'youtube-transcript';

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

// YouTube Data API v3 configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// List of YouTube channel IDs to monitor
// You can find a channel ID by going to the channel page and looking at the URL
// e.g., https://www.youtube.com/channel/UC_CHANNEL_ID_HERE
const YOUTUBE_CHANNELS = process.env.YOUTUBE_CHANNELS?.split(',') || [];

// Number of recent videos to fetch per channel
const VIDEOS_PER_CHANNEL = 5;

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

// Fetch recent videos from a YouTube channel (excluding Shorts)
async function fetchChannelVideos(channelId: string): Promise<YouTubeVideo[]> {
  try {
    // Convert channel ID to uploads playlist ID (excluding Shorts)
    // UC... -> UULF... to get only long-form videos
    let playlistId: string;
    if (channelId.startsWith('UC')) {
      playlistId = 'UULF' + channelId.substring(2);
      console.log(`Fetching long-form videos from playlist: ${playlistId} (channel: ${channelId})`);
    } else {
      // Fallback to regular uploads playlist if not a UC channel
      playlistId = 'UU' + channelId.substring(2);
      console.log(`Channel ID doesn't start with UC, using regular uploads: ${playlistId}`);
    }
    
    // Fetch videos from the playlist
    const playlistParams = new URLSearchParams({
      key: YOUTUBE_API_KEY!,
      playlistId: playlistId,
      part: 'snippet',
      maxResults: VIDEOS_PER_CHANNEL.toString()
    });

    const playlistResponse = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${playlistParams}`);
    
    if (!playlistResponse.ok) {
      // If UULF playlist doesn't exist, fall back to regular uploads
      if (playlistResponse.status === 404 && playlistId.startsWith('UULF')) {
        console.log('UULF playlist not found, falling back to regular uploads playlist');
        playlistId = 'UU' + channelId.substring(2);
        
        const fallbackParams = new URLSearchParams({
          key: YOUTUBE_API_KEY!,
          playlistId: playlistId,
          part: 'snippet',
          maxResults: VIDEOS_PER_CHANNEL.toString()
        });
        
        const fallbackResponse = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${fallbackParams}`);
        
        if (!fallbackResponse.ok) {
          console.error(`YouTube API error for playlist ${playlistId}:`, fallbackResponse.status);
          return [];
        }
        
        const fallbackData = await fallbackResponse.json();
        
        // Log all videos from fallback playlist
        if (fallbackData.items && fallbackData.items.length > 0) {
          console.log(`Found ${fallbackData.items.length} videos from fallback playlist ${playlistId}:`);
          fallbackData.items.forEach((item: any, index: number) => {
            console.log(`  ${index + 1}. "${item.snippet.title}" - Video ID: ${item.snippet.resourceId.videoId}`);
          });
        }
        
        return fallbackData.items.map((item: any) => ({
          id: item.snippet.resourceId.videoId,
          snippet: item.snippet
        }));
      }
      
      console.error(`YouTube API error for playlist ${playlistId}:`, playlistResponse.status);
      return [];
    }

    const playlistData = await playlistResponse.json();
    
    // Log all videos for debugging
    if (playlistData.items && playlistData.items.length > 0) {
      console.log(`Found ${playlistData.items.length} videos from playlist ${playlistId}:`);
      playlistData.items.forEach((item: any, index: number) => {
        console.log(`  ${index + 1}. "${item.snippet.title}" - Video ID: ${item.snippet.resourceId.videoId}`);
      });
    } else {
      console.log(`No videos found in playlist ${playlistId}`);
    }
    
    return playlistData.items.map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      snippet: item.snippet
    }));
  } catch (error) {
    console.error(`Error fetching videos for channel ${channelId}:`, error);
    return [];
  }
}

// Fetch video captions/transcript
// Fetch video transcript using youtube-transcript package
async function fetchVideoTranscript(videoId: string): Promise<string | null> {
  try {
    // Try to fetch transcript using the youtube-transcript package
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcriptData || transcriptData.length === 0) {
      console.log(`No transcript available for video ${videoId}`);
      return null;
    }
    
    // Combine all transcript segments into a single string
    const fullTranscript = transcriptData
      .map(segment => segment.text)
      .join(' ')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    console.log(`Successfully fetched transcript for video ${videoId} (${fullTranscript.length} chars)`);
    return fullTranscript;
    
  } catch (error: any) {
    // Common errors:
    // - "Transcript is disabled" - no captions available
    // - "Video unavailable" - private or deleted video
    // - Network errors
    console.log(`Could not fetch transcript for video ${videoId}:`, error.message);
    return null;
  }
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
    if (!YOUTUBE_API_KEY) {
      console.error('YOUTUBE_API_KEY not configured');
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
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
    for (const channelId of YOUTUBE_CHANNELS) {
      try {
        console.log(`Processing channel: ${channelId}`);
        
        // Fetch recent videos
        const videos = await fetchChannelVideos(channelId);
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

            // Fetch transcript
            const transcript = await fetchVideoTranscript(video.id);
            
            // Analyze content and generate demands
            const demands = await analyzeVideoContent(video, transcript);
            console.log(`Generated ${demands.length} demands for video ${video.id}`);

            if (demands.length > 0) {
              // Save to database
              await saveDemandsToDB(demands, video);
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
        console.error(`Error processing channel ${channelId}:`, error);
        results.errors.push(`Channel ${channelId}: ${error}`);
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
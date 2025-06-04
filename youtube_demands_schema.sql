-- YouTube Demands Table Schema
-- This table stores political demands generated from YouTube video analysis

CREATE TABLE IF NOT EXISTS youtube_demands (
    id SERIAL PRIMARY KEY,
    demand_text TEXT NOT NULL,
    source_video_id VARCHAR(255) NOT NULL,
    source_video_title TEXT NOT NULL,
    source_channel_id VARCHAR(255) NOT NULL,
    source_channel_title VARCHAR(255) NOT NULL,
    video_published_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure we don't duplicate demands from the same video
    UNIQUE(demand_text, source_video_id)
);

-- Create indexes for common queries
CREATE INDEX idx_youtube_demands_video_id ON youtube_demands(source_video_id);
CREATE INDEX idx_youtube_demands_channel_id ON youtube_demands(source_channel_id);
CREATE INDEX idx_youtube_demands_created_at ON youtube_demands(created_at DESC);
CREATE INDEX idx_youtube_demands_video_published ON youtube_demands(video_published_at DESC);

-- Optional: View for recent demands
CREATE VIEW recent_youtube_demands AS
SELECT 
    id,
    demand_text,
    source_video_title,
    source_channel_title,
    video_published_at,
    created_at
FROM youtube_demands
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY created_at DESC;
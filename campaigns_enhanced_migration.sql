-- Enhanced campaigns migration
-- Adds user ownership, view tracking, and message field
-- Run after campaigns_schema.sql and campaigns_location_migration.sql

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Add index for efficient user campaign queries
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

-- Add index for popular campaigns (sorted by message_sent_count)
CREATE INDEX IF NOT EXISTS idx_campaigns_popularity ON campaigns(message_sent_count DESC);

-- Comments for documentation
COMMENT ON COLUMN campaigns.user_id IS 'User who created the campaign (NULL if deleted user)';
COMMENT ON COLUMN campaigns.message IS 'The actual issue/message text from the creator';
COMMENT ON COLUMN campaigns.view_count IS 'Number of times campaign page was viewed';

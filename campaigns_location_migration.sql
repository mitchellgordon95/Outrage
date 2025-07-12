-- Migration to add location fields to campaigns table
-- Run this migration to enable location-based campaign discovery

ALTER TABLE campaigns 
ADD COLUMN city VARCHAR(255),
ADD COLUMN state VARCHAR(100),
ADD COLUMN location_display VARCHAR(255);

-- Add indexes for efficient location-based queries
CREATE INDEX idx_campaigns_city ON campaigns(city);
CREATE INDEX idx_campaigns_state ON campaigns(state);
CREATE INDEX idx_campaigns_location ON campaigns(city, state);

-- Optional: Add a comment to document the fields
COMMENT ON COLUMN campaigns.city IS 'City name for location-based campaign filtering';
COMMENT ON COLUMN campaigns.state IS 'State/province for location-based campaign filtering';
COMMENT ON COLUMN campaigns.location_display IS 'Human-readable location string for display (e.g., "San Francisco, CA")';
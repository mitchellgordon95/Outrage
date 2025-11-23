-- Migration to drop campaigns and youtube_demands tables
-- This removes all campaign-related functionality from the database

-- Drop the recent_youtube_demands view first (depends on youtube_demands table)
DROP VIEW IF EXISTS recent_youtube_demands;

-- Drop the youtube_demands table
DROP TABLE IF EXISTS youtube_demands;

-- Drop the campaigns table
DROP TABLE IF EXISTS campaigns;

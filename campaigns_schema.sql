CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    demands JSONB,
    representatives JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    message_sent_count INTEGER DEFAULT 0
);

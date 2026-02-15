-- Add author_id to messages for proper user tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Create direct_messages table for 1-on-1 conversations
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_dm_pair UNIQUE (user1_id, user2_id),
    CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Create dm_messages table
CREATE TABLE IF NOT EXISTS dm_messages (
    id UUID PRIMARY KEY,
    dm_id UUID NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    edited_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_author_id ON messages(author_id);
CREATE INDEX IF NOT EXISTS idx_dm_user1 ON direct_messages(user1_id);
CREATE INDEX IF NOT EXISTS idx_dm_user2 ON direct_messages(user2_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_dm ON dm_messages(dm_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created ON dm_messages(created_at);

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    channel_type VARCHAR(50) DEFAULT 'text',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invites table
CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY,
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    code VARCHAR(8) UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for channels and invites
CREATE INDEX IF NOT EXISTS idx_channels_guild ON channels(guild_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_guild ON invites(guild_id);

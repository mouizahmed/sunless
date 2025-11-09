# PostgreSQL Database Schema

**Application:** Sunless v2 - AI Desktop Assistant
**Version:** 1.0 (MVP)
**Database:** PostgreSQL 14+
**Last Updated:** 2025-01-09

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Diagram](#schema-diagram)
3. [Tables](#tables)
   - [Users & Authentication](#users--authentication)
   - [Conversations & Messages](#conversations--messages)
   - [Attachments](#attachments)
   - [Usage Tracking](#usage-tracking)
   - [Settings & Sync](#settings--sync)
4. [Search Functions](#search-functions)
5. [Analytics Views](#analytics-views)
6. [Security](#security)
7. [Initialization](#initialization)

---

## Overview

This schema supports a multi-user AI desktop assistant with:
- ✅ User authentication and sessions
- ✅ Conversation management with full-text search
- ✅ Screenshot/file attachments
- ✅ Usage tracking and analytics
- ✅ Local SQLite ↔ Cloud PostgreSQL sync
- ✅ BYOK (Bring Your Own Key) for LLM APIs
- ✅ Future RAG-ready (columns in place but unused)

**Design Principles:**
- Keep it simple (MVP first, add complexity when needed)
- PostgreSQL full-text search (no vector DB initially)
- Soft deletes for audit trail
- Row-level security for multi-tenancy
- Sync-friendly with local SQLite support

---

## Schema Diagram

```
users (1) ──────┬─────────── (M) conversations (1) ───── (M) messages
    │           │                                              │
    │           │                                              │
    │           ├─────────── (M) attachments ─────────────────┘
    │           │
    │           ├─────────── (M) usage_logs
    │           │
    │           └─────────── (M) sync_state
    │
    ├─────────── (M) sessions
    │
    ├─────────── (M) user_api_keys
    │
    └─────────── (1) user_settings
```

---

## Tables

### Users & Authentication

#### 1. `users`

Primary user accounts table.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt

  -- Profile
  full_name VARCHAR(255),
  avatar_url TEXT,

  -- Subscription
  plan_type VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
  plan_status VARCHAR(50) DEFAULT 'active',

  -- LLM settings
  default_llm_provider VARCHAR(50) DEFAULT 'openai', -- openai, anthropic
  uses_own_api_key BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

**Columns:**
- `id`: Unique user identifier (UUID)
- `email`: User's email (unique, used for login)
- `password_hash`: Bcrypt hashed password
- `plan_type`: Subscription tier (free/pro/enterprise)
- `uses_own_api_key`: Whether user brings their own LLM API key
- `deleted_at`: Soft delete timestamp

---

#### 2. `sessions`

Manages user authentication sessions and refresh tokens.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Device info
  device_id VARCHAR(255) NOT NULL, -- Unique per desktop installation
  device_name VARCHAR(255), -- "MacBook Pro", "Windows Desktop"

  -- Tokens
  refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
  access_token_jti VARCHAR(255) UNIQUE, -- For revocation

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_device ON sessions(user_id, device_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_active ON sessions(expires_at) WHERE expires_at > NOW();
```

**Purpose:**
- Store JWT refresh tokens (hashed)
- Track active sessions per device
- Support multi-device login
- Enable session revocation

---

#### 3. `user_api_keys`

Encrypted storage for user's own LLM API keys (BYOK).

```sql
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  provider VARCHAR(50) NOT NULL, -- openai, anthropic
  encrypted_api_key TEXT NOT NULL, -- AES-256 encrypted
  key_name VARCHAR(100) DEFAULT 'My API Key',

  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, provider, key_name)
);

CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id) WHERE is_active = true;
```

**Security:**
- API keys stored encrypted (AES-256)
- Never return decrypted keys to client
- Only decrypt server-side when making LLM API calls

---

### Conversations & Messages

#### 4. `conversations`

Chat threads/sessions.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Metadata
  title VARCHAR(500), -- Auto-generated or user-set

  -- Model configuration
  llm_provider VARCHAR(50) NOT NULL DEFAULT 'openai',
  llm_model VARCHAR(100) NOT NULL DEFAULT 'gpt-4',
  system_prompt TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER,

  -- Organization
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  folder VARCHAR(255), -- Optional folder/category

  -- Sync (for local SQLite ↔ cloud sync)
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_conversations_updated_at ON conversations(user_id, updated_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_conversations_pinned ON conversations(user_id, is_pinned)
  WHERE is_pinned = true AND deleted_at IS NULL;
CREATE INDEX idx_conversations_folder ON conversations(user_id, folder)
  WHERE deleted_at IS NULL;
```

**Features:**
- Per-conversation model settings (can override user defaults)
- Pin/archive functionality
- Optional folder organization
- Sync version tracking for conflict resolution

---

#### 5. `messages`

Individual messages within conversations.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Message data
  role VARCHAR(20) NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,

  -- Metadata
  token_count INTEGER,
  finish_reason VARCHAR(50), -- stop, length, content_filter
  model VARCHAR(100), -- Actual model used (can differ from conversation default)

  -- Full-text search (PostgreSQL built-in)
  content_search tsvector GENERATED ALWAYS AS (
    to_tsvector('english', content)
  ) STORED,

  -- Sync tracking
  local_id UUID, -- Maps to local SQLite ID
  sync_status VARCHAR(20) DEFAULT 'synced', -- synced, pending, conflict

  -- Future: RAG support (leave NULL for now)
  pinecone_vector_id VARCHAR(255),
  has_embedding BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_search ON messages USING GIN(content_search);
CREATE INDEX idx_messages_sync_pending ON messages(sync_status)
  WHERE sync_status != 'synced';
CREATE INDEX idx_messages_role ON messages(conversation_id, role);
```

**Key Features:**
- `content_search`: Generated tsvector column for full-text search
- `local_id`: Maps to local SQLite database for sync
- RAG columns (`pinecone_vector_id`, `has_embedding`) reserved for future use

---

### Attachments

#### 6. `attachments`

Screenshots and file attachments.

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- File data
  type VARCHAR(20) NOT NULL DEFAULT 'screenshot', -- screenshot, image, file
  mime_type VARCHAR(100),
  file_name VARCHAR(255),
  file_size_bytes BIGINT,

  -- Storage
  storage_type VARCHAR(20) DEFAULT 's3', -- s3, cloudflare_r2, local
  storage_path TEXT NOT NULL, -- S3 key or file path
  thumbnail_url TEXT,

  -- Image metadata
  width INTEGER,
  height INTEGER,

  -- Future: OCR support (leave NULL for now)
  ocr_text TEXT,
  ocr_confidence DECIMAL(5,2),
  ocr_processed_at TIMESTAMP WITH TIME ZONE,

  -- Future: Vector embedding (leave NULL for now)
  pinecone_vector_id VARCHAR(255),
  has_embedding BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_attachments_message_id ON attachments(message_id);
CREATE INDEX idx_attachments_user_id ON attachments(user_id, created_at DESC);
CREATE INDEX idx_attachments_type ON attachments(type);
```

**Storage Strategy:**
- Store actual file in S3/Cloudflare R2
- Store metadata in PostgreSQL
- OCR and embedding columns reserved for future

---

### Usage Tracking

#### 7. `usage_logs`

Track LLM API usage for analytics and billing.

```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- LLM usage
  llm_provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,

  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking (in cents)
  cost_cents DECIMAL(10,4),

  -- API key tracking
  used_own_api_key BOOLEAN DEFAULT false,
  api_key_id UUID REFERENCES user_api_keys(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id, created_at DESC);
CREATE INDEX idx_usage_logs_conversation_id ON usage_logs(conversation_id);
CREATE INDEX idx_usage_logs_date ON usage_logs(created_at::DATE, user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);
```

**Use Cases:**
- Track token usage per user
- Calculate costs
- Enforce usage limits
- Analytics dashboard
- Distinguish between user's API key vs. platform key

---

### Settings & Sync

#### 8. `user_settings`

User preferences and desktop app configuration.

```sql
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Desktop app settings
  window_position_x INTEGER,
  window_position_y INTEGER,
  window_width INTEGER DEFAULT 600,
  theme VARCHAR(20) DEFAULT 'dark', -- dark, light, auto

  -- Keyboard shortcuts (stored as JSON)
  keyboard_shortcuts JSONB DEFAULT '{}',

  -- Privacy
  share_usage_data BOOLEAN DEFAULT false,
  enable_analytics BOOLEAN DEFAULT true,

  -- Sync settings
  auto_sync BOOLEAN DEFAULT true,
  sync_frequency_minutes INTEGER DEFAULT 5,

  -- Notifications
  enable_notifications BOOLEAN DEFAULT true,

  -- Updated timestamp
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**JSONB Example for keyboard_shortcuts:**
```json
{
  "toggle_visibility": "Cmd+\\",
  "screenshot": "Cmd+Shift+S",
  "move_up": "Cmd+Up"
}
```

---

#### 9. `sync_state`

Track synchronization between local SQLite and cloud PostgreSQL.

```sql
CREATE TABLE sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,

  -- Entity tracking
  entity_type VARCHAR(50) NOT NULL, -- conversation, message, attachment
  entity_id UUID NOT NULL,

  -- Version tracking
  local_version INTEGER DEFAULT 1,
  cloud_version INTEGER DEFAULT 1,

  -- Sync status
  sync_status VARCHAR(20) DEFAULT 'pending', -- synced, pending, conflict
  last_synced_at TIMESTAMP WITH TIME ZONE,

  -- Conflict resolution
  conflict_data JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, device_id, entity_type, entity_id)
);

CREATE INDEX idx_sync_state_user_device ON sync_state(user_id, device_id);
CREATE INDEX idx_sync_state_pending ON sync_state(sync_status)
  WHERE sync_status != 'synced';
CREATE INDEX idx_sync_state_entity ON sync_state(entity_type, entity_id);
```

**Sync Strategy:**
- Desktop app maintains local SQLite
- Background process syncs changes to PostgreSQL
- Version numbers detect conflicts
- Last-write-wins or user prompt for resolution

---

## Search Functions

### Full-Text Search (PostgreSQL Built-in)

#### Search Messages

```sql
CREATE OR REPLACE FUNCTION search_messages(
  search_query TEXT,
  search_user_id UUID,
  limit_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  message_id UUID,
  conversation_id UUID,
  conversation_title VARCHAR(500),
  content TEXT,
  role VARCHAR(20),
  rank REAL,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    c.title,
    m.content,
    m.role,
    ts_rank(m.content_search, websearch_to_tsquery('english', search_query)) AS rank,
    m.created_at
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE
    c.user_id = search_user_id
    AND m.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND m.content_search @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;
```

**Usage:**
```sql
SELECT * FROM search_messages('error handling code', 'user-uuid-here', 20);
```

---

#### Search Conversations

```sql
CREATE OR REPLACE FUNCTION search_conversations(
  search_query TEXT,
  search_user_id UUID,
  limit_results INTEGER DEFAULT 20
)
RETURNS TABLE (
  conversation_id UUID,
  title VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.created_at,
    c.updated_at
  FROM conversations c
  WHERE
    c.user_id = search_user_id
    AND c.deleted_at IS NULL
    AND (
      c.title ILIKE '%' || search_query || '%'
      OR c.id IN (
        SELECT DISTINCT m.conversation_id
        FROM messages m
        WHERE m.content_search @@ websearch_to_tsquery('english', search_query)
      )
    )
  ORDER BY c.updated_at DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;
```

---

## Analytics Views

### User Usage Summary

```sql
CREATE VIEW user_usage_summary AS
SELECT
  u.id AS user_id,
  u.email,
  u.plan_type,
  COUNT(DISTINCT c.id) AS total_conversations,
  COUNT(DISTINCT m.id) AS total_messages,
  COUNT(DISTINCT a.id) AS total_attachments,
  COALESCE(SUM(ul.total_tokens), 0) AS total_tokens_used,
  COALESCE(SUM(ul.cost_cents), 0) AS total_cost_cents,
  MAX(m.created_at) AS last_message_at,
  u.created_at AS user_since
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id AND c.deleted_at IS NULL
LEFT JOIN messages m ON c.id = m.conversation_id AND m.deleted_at IS NULL
LEFT JOIN attachments a ON u.id = a.user_id AND a.deleted_at IS NULL
LEFT JOIN usage_logs ul ON u.id = ul.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.plan_type, u.created_at;
```

**Usage:**
```sql
SELECT * FROM user_usage_summary WHERE total_tokens_used > 100000;
```

---

### Daily Usage Stats

```sql
CREATE VIEW daily_usage_stats AS
SELECT
  user_id,
  created_at::DATE AS usage_date,
  COUNT(*) AS total_requests,
  SUM(prompt_tokens) AS total_prompt_tokens,
  SUM(completion_tokens) AS total_completion_tokens,
  SUM(total_tokens) AS total_tokens,
  SUM(cost_cents) AS total_cost_cents,
  COUNT(DISTINCT conversation_id) AS unique_conversations
FROM usage_logs
GROUP BY user_id, created_at::DATE
ORDER BY usage_date DESC;
```

---

## Security

### Row-Level Security (RLS)

Ensures users can only access their own data.

```sql
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Policies (users can only see their own data)
CREATE POLICY conversations_user_isolation ON conversations
  FOR ALL USING (user_id = current_setting('app.user_id')::UUID);

CREATE POLICY messages_user_isolation ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = current_setting('app.user_id')::UUID
    )
  );

CREATE POLICY attachments_user_isolation ON attachments
  FOR ALL USING (user_id = current_setting('app.user_id')::UUID);
```

**How to use:**
```sql
-- Set user context before queries
SET app.user_id = 'user-uuid-here';

-- Now all queries are automatically filtered by user_id
SELECT * FROM conversations; -- Only returns this user's conversations
```

---

### Best Practices

1. **Password Hashing**: Use bcrypt with minimum 10 rounds
2. **API Key Encryption**: AES-256 with unique key per environment
3. **JWT Tokens**:
   - Access tokens: 15 minutes expiry
   - Refresh tokens: 30 days expiry
4. **HTTPS Only**: Never send tokens over HTTP
5. **Rate Limiting**: Implement at API layer

---

## Initialization

### Complete Initialization Script

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attachments_updated_at
  BEFORE UPDATE ON attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_state_updated_at
  BEFORE UPDATE ON sync_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Migration Path (Future RAG Support)

The schema is designed to add vector search later without breaking changes:

### Phase 1: Current (MVP)
- PostgreSQL full-text search
- Columns reserved: `pinecone_vector_id`, `has_embedding`, `ocr_text`

### Phase 2: Add RAG (Future)
```sql
-- Create new tables
CREATE TABLE embeddings (...);
CREATE TABLE embedding_jobs (...);
CREATE TABLE code_snippets (...);
CREATE TABLE rag_contexts (...);

-- Update existing records
UPDATE messages SET has_embedding = false WHERE has_embedding IS NULL;
```

**No schema changes required** - just populate the reserved columns!

---

## Database Statistics

**Estimated storage for 10,000 users:**
- Users: ~1 MB
- Conversations: 50 per user = 500K rows ≈ 100 MB
- Messages: 50 per conversation = 25M rows ≈ 5 GB
- Attachments: 2 per conversation = 1M rows ≈ 200 MB (metadata only)
- Usage logs: 25M rows ≈ 2 GB
- **Total: ~7.5 GB**

---

## Maintenance

### Regular Tasks

```sql
-- Vacuum to reclaim space (run weekly)
VACUUM ANALYZE;

-- Reindex for performance (run monthly)
REINDEX DATABASE your_database_name;

-- Clean up old sessions (run daily)
DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '7 days';
```

### Backup Strategy

1. **Daily automated backups** (full database)
2. **Point-in-time recovery** enabled
3. **Retention**: 30 days minimum
4. **Test restores** monthly

---

## Connection Info

**Recommended Connection Pool Settings:**
- Min connections: 10
- Max connections: 100
- Connection timeout: 30s
- Idle timeout: 600s

---

## Version History

| Version | Date       | Changes                           |
|---------|------------|-----------------------------------|
| 1.0     | 2025-01-09 | Initial schema (MVP without RAG) |

---

## License

Internal use only - Sunless v2 Project

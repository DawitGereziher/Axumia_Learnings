-- ============================================================
-- Session Monitoring Migration
-- Safe to run on existing DB — only ADDS new tables/columns,
-- never drops or alters existing ones.
-- ============================================================

-- 1. New columns on bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS platform              TEXT,
  ADD COLUMN IF NOT EXISTS platform_meeting_id   TEXT,
  ADD COLUMN IF NOT EXISTS session_started_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_ended_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_duration_m    INTEGER,
  ADD COLUMN IF NOT EXISTS session_flag          TEXT;

-- 2. New table: instructor_video_accounts
CREATE TABLE IF NOT EXISTS instructor_video_accounts (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id    UUID        NOT NULL,
  platform         TEXT        NOT NULL,
  platform_user_id TEXT        NOT NULL,
  access_token     TEXT        NOT NULL,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  scope            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_instructor_video_accounts_instructor
    FOREIGN KEY (instructor_id)
    REFERENCES instructor_profiles(id)
    ON DELETE CASCADE,

  CONSTRAINT uq_instructor_video_accounts_instructor_platform
    UNIQUE (instructor_id, platform)
);

-- 3. New table: session_events
CREATE TABLE IF NOT EXISTS session_events (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id        UUID        NOT NULL,
  platform          TEXT        NOT NULL,
  event_type        TEXT        NOT NULL,
  platform_event_id TEXT,
  payload           JSONB       NOT NULL DEFAULT '{}',
  participant_count INTEGER,
  occurred_at       TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_session_events_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_events_booking_id   ON session_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_session_events_occurred_at  ON session_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_bookings_platform_meeting   ON bookings(platform, platform_meeting_id)
  WHERE platform IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_session_flag       ON bookings(session_flag)
  WHERE session_flag IS NOT NULL;

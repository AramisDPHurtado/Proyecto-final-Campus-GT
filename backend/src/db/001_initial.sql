CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 80),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracks (
  id SMALLINT PRIMARY KEY CHECK (id IN (1, 2)),
  name TEXT NOT NULL
);

INSERT INTO tracks (id, name)
VALUES (1, 'Pista 1'), (2, 'Pista 2')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY,
  track_id SMALLINT NOT NULL REFERENCES tracks(id),
  organizer_id UUID NOT NULL REFERENCES users(id),
  operating_date DATE NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  join_policy TEXT NOT NULL CHECK (join_policy IN ('open', 'approval')),
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  EXCLUDE USING gist (
    track_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status = 'confirmed')
);

CREATE INDEX IF NOT EXISTS reservations_time_idx
  ON reservations (starts_at, ends_at)
  WHERE status = 'confirmed';

CREATE TABLE IF NOT EXISTS reservation_participants (
  id UUID PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 2 AND 80),
  added_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservation_participants_user_idx
  ON reservation_participants (added_by_user_id, reservation_id);

CREATE TABLE IF NOT EXISTS join_requests (
  id UUID PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  participant_names JSONB NOT NULL CHECK (jsonb_typeof(participant_names) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS join_requests_one_pending_idx
  ON join_requests (reservation_id, requester_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS join_requests_host_idx
  ON join_requests (reservation_id, status);

CREATE TABLE IF NOT EXISTS track_blocks (
  id UUID PRIMARY KEY,
  track_id SMALLINT NOT NULL REFERENCES tracks(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 120),
  created_by_admin_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS track_blocks_time_idx
  ON track_blocks (track_id, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE publications (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('site', 'viewer')),
  current_version TEXT,
  password_hash TEXT,
  expires_at INTEGER,
  noindex INTEGER NOT NULL DEFAULT 1,
  comments_enabled INTEGER NOT NULL DEFAULT 0,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX publications_project ON publications (project_id);

CREATE TABLE versions (
  id TEXT PRIMARY KEY,
  publication_id TEXT NOT NULL REFERENCES publications (id),
  label TEXT NOT NULL,
  source_version TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'committed')),
  file_count INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  committed_at INTEGER
);

CREATE INDEX versions_publication ON versions (publication_id, created_at);

CREATE TABLE files (
  version_id TEXT NOT NULL REFERENCES versions (id),
  path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  PRIMARY KEY (version_id, path)
);

CREATE TABLE blobs (
  publication_id TEXT NOT NULL REFERENCES publications (id),
  sha256 TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (publication_id, sha256)
);

CREATE TABLE daily_views (
  publication_id TEXT NOT NULL REFERENCES publications (id),
  day TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (publication_id, day)
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  publication_id TEXT NOT NULL REFERENCES publications (id),
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX comments_publication ON comments (publication_id, created_at);

CREATE TABLE rate_limits (
  bucket TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);

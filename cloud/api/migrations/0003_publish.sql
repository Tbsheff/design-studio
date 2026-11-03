PRAGMA foreign_keys = ON;

CREATE TABLE publication_lockout (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  publication_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
  failures INTEGER NOT NULL DEFAULT 0 CHECK (failures >= 0),
  locked_until INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  UNIQUE (org_id, publication_id, ip_hash),
  FOREIGN KEY (org_id, publication_id) REFERENCES publication (org_id, id) ON DELETE CASCADE
);

CREATE INDEX publication_lockout_until_idx ON publication_lockout (locked_until);

CREATE TABLE share_comment (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  share_id TEXT NOT NULL,
  author_name TEXT,
  anchor TEXT,
  body TEXT NOT NULL,
  is_held INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, share_id) REFERENCES share (org_id, id) ON DELETE CASCADE
);

CREATE INDEX share_comment_share_idx ON share_comment (org_id, share_id, created_at);

CREATE INDEX publication_version_committed_idx ON publication_version (org_id, publication_id, committed_at);

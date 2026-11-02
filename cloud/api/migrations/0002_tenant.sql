PRAGMA foreign_keys = ON;

CREATE TABLE key_meta (
  key_id TEXT NOT NULL PRIMARY KEY REFERENCES "apikey" ("id") ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  acting_user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE INDEX key_meta_org_idx ON key_meta (org_id);
CREATE INDEX key_meta_acting_user_idx ON key_meta (acting_user_id);

CREATE TABLE project (
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (org_id, id)
);

CREATE INDEX project_updated_idx ON project (org_id, updated_at);

CREATE TABLE direction (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  head_version_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE
);

CREATE INDEX direction_project_idx ON direction (org_id, project_id);

CREATE TABLE version (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  direction_id TEXT NOT NULL,
  parent_version_id TEXT,
  message TEXT,
  author_id TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, direction_id) REFERENCES direction (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, parent_version_id) REFERENCES version (org_id, id)
);

CREATE INDEX version_direction_idx ON version (org_id, direction_id, created_at);

CREATE TABLE blob_ref (
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  id TEXT NOT NULL CHECK (length(id) = 64),
  rev INTEGER NOT NULL DEFAULT 0,
  size INTEGER NOT NULL,
  refcount INTEGER NOT NULL DEFAULT 0 CHECK (refcount >= 0),
  created_at INTEGER NOT NULL,
  zero_at INTEGER,
  PRIMARY KEY (org_id, id)
);

CREATE INDEX blob_ref_zero_idx ON blob_ref (refcount, zero_at);

CREATE TABLE version_file (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  version_id TEXT NOT NULL,
  path TEXT NOT NULL,
  blob_id TEXT NOT NULL,
  mode INTEGER NOT NULL DEFAULT 420,
  PRIMARY KEY (org_id, id),
  UNIQUE (org_id, version_id, path),
  FOREIGN KEY (org_id, version_id) REFERENCES version (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, blob_id) REFERENCES blob_ref (org_id, id)
);

CREATE INDEX version_file_blob_idx ON version_file (org_id, blob_id);

CREATE TABLE version_name (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  version_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, version_id) REFERENCES version (org_id, id) ON DELETE CASCADE
);

CREATE INDEX version_name_version_idx ON version_name (org_id, version_id);

CREATE TABLE comment (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  project_id TEXT NOT NULL,
  direction_id TEXT,
  version_id TEXT,
  author_id TEXT,
  anchor TEXT,
  body TEXT NOT NULL,
  resolved_at INTEGER,
  resolved_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, direction_id) REFERENCES direction (org_id, id) ON DELETE CASCADE
);

CREATE INDEX comment_project_idx ON comment (org_id, project_id, created_at);

CREATE TABLE comment_reply (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  comment_id TEXT NOT NULL,
  author_id TEXT,
  body TEXT NOT NULL,
  is_held INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, comment_id) REFERENCES comment (org_id, id) ON DELETE CASCADE
);

CREATE INDEX comment_reply_comment_idx ON comment_reply (org_id, comment_id, created_at);

CREATE TABLE attachment (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  created_by TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE
);

CREATE INDEX attachment_project_idx ON attachment (org_id, project_id);

CREATE TABLE layer_lock (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  project_id TEXT NOT NULL,
  direction_id TEXT NOT NULL,
  layer_ref TEXT NOT NULL,
  user_id TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  UNIQUE (org_id, direction_id, layer_ref),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, direction_id) REFERENCES direction (org_id, id) ON DELETE CASCADE
);

CREATE TABLE design_rule (
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  project_id TEXT,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE
);

CREATE INDEX design_rule_project_idx ON design_rule (org_id, project_id);

CREATE TABLE design_pack (
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  head_pack_version_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (org_id, id)
);

CREATE TABLE pack_version (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  pack_id TEXT NOT NULL,
  manifest TEXT NOT NULL,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, pack_id) REFERENCES design_pack (org_id, id) ON DELETE CASCADE
);

CREATE INDEX pack_version_pack_idx ON pack_version (org_id, pack_id, created_at);

CREATE TABLE ship_settings (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  project_id TEXT NOT NULL,
  settings TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  UNIQUE (org_id, project_id),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE
);

CREATE TABLE project_setting_policy (
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  project_id TEXT,
  allow_bash_cap TEXT NOT NULL DEFAULT 'member',
  allow_install_cap TEXT NOT NULL DEFAULT 'member',
  updated_by TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  UNIQUE (org_id, project_id),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE
);

CREATE TABLE run_summary (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  project_id TEXT NOT NULL,
  direction_id TEXT,
  user_id TEXT,
  device_id TEXT,
  status TEXT NOT NULL,
  summary TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, direction_id) REFERENCES direction (org_id, id) ON DELETE CASCADE
);

CREATE INDEX run_summary_project_idx ON run_summary (org_id, project_id, started_at);

CREATE TABLE mcp_activity (
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  project_id TEXT,
  key_id TEXT,
  tool TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE
);

CREATE INDEX mcp_activity_created_idx ON mcp_activity (org_id, created_at);

CREATE TABLE share (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  project_id TEXT NOT NULL,
  direction_id TEXT,
  version_id TEXT,
  can_comment INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  revoked_at INTEGER,
  revoked_by TEXT,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, direction_id) REFERENCES direction (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, version_id) REFERENCES version (org_id, id)
);

CREATE INDEX share_project_idx ON share (org_id, project_id);

CREATE TABLE share_frame (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  share_id TEXT NOT NULL,
  frame_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, id),
  UNIQUE (org_id, share_id, frame_id),
  FOREIGN KEY (org_id, share_id) REFERENCES share (org_id, id) ON DELETE CASCADE
);

CREATE TABLE share_token (
  token_hash TEXT NOT NULL PRIMARY KEY CHECK (length(token_hash) = 64),
  org_id TEXT NOT NULL,
  share_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (org_id, share_id) REFERENCES share (org_id, id) ON DELETE CASCADE
);

CREATE INDEX share_token_share_idx ON share_token (org_id, share_id);

CREATE TABLE publication (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  project_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT,
  live_version_id TEXT,
  password_hash TEXT,
  allow_comments INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER,
  deleted_at INTEGER,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE
);

CREATE INDEX publication_project_idx ON publication (org_id, project_id);

CREATE TABLE publication_slug (
  slug TEXT NOT NULL PRIMARY KEY,
  org_id TEXT NOT NULL,
  publication_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (org_id, publication_id) REFERENCES publication (org_id, id) ON DELETE CASCADE
);

CREATE INDEX publication_slug_publication_idx ON publication_slug (org_id, publication_id);

CREATE TABLE publication_version (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  publication_id TEXT NOT NULL,
  source_version_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  manifest_hash TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  committed_at INTEGER,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, publication_id) REFERENCES publication (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, source_version_id) REFERENCES version (org_id, id)
);

CREATE INDEX publication_version_publication_idx ON publication_version (org_id, publication_id, created_at);

CREATE TABLE publication_file (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  publication_version_id TEXT NOT NULL,
  path TEXT NOT NULL,
  blob_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  UNIQUE (org_id, publication_version_id, path),
  FOREIGN KEY (org_id, publication_version_id) REFERENCES publication_version (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, blob_id) REFERENCES blob_ref (org_id, id)
);

CREATE INDEX publication_file_blob_idx ON publication_file (org_id, blob_id);

CREATE TABLE publication_comment (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  publication_id TEXT NOT NULL,
  author_name TEXT,
  anchor TEXT,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, publication_id) REFERENCES publication (org_id, id) ON DELETE CASCADE
);

CREATE INDEX publication_comment_publication_idx ON publication_comment (org_id, publication_id, created_at);

CREATE TABLE daily_views (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  publication_id TEXT NOT NULL,
  day TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, id),
  UNIQUE (org_id, publication_id, day),
  FOREIGN KEY (org_id, publication_id) REFERENCES publication (org_id, id) ON DELETE CASCADE
);

CREATE TABLE org_seq (
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, id)
);

CREATE TABLE change_log (
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  seq INTEGER NOT NULL,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  row_rev INTEGER NOT NULL,
  op TEXT NOT NULL CHECK (op IN ('insert', 'update', 'delete')),
  actor_id TEXT,
  device_id TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  UNIQUE (org_id, seq)
);

CREATE INDEX change_log_row_idx ON change_log (org_id, table_name, row_id);

CREATE TABLE audit_log (
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  actor_kind TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  detail TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id)
);

CREATE INDEX audit_log_created_idx ON audit_log (org_id, created_at);

CREATE TABLE device (
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  revoked_at INTEGER,
  PRIMARY KEY (org_id, id)
);

CREATE INDEX device_user_idx ON device (org_id, user_id);

CREATE TABLE agent_request (
  org_id TEXT NOT NULL REFERENCES "organization" ("id") ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  key_id TEXT,
  acting_user_id TEXT,
  project_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('publish', 'share')),
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'done')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id) ON DELETE CASCADE
);

CREATE INDEX agent_request_status_idx ON agent_request (org_id, status, created_at);

CREATE TABLE approval (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  agent_request_id TEXT NOT NULL,
  decided_by TEXT NOT NULL REFERENCES "user" ("id"),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'denied')),
  decided_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, id),
  UNIQUE (org_id, agent_request_id),
  FOREIGN KEY (org_id, agent_request_id) REFERENCES agent_request (org_id, id) ON DELETE CASCADE
);

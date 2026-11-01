import { LIMITS, type RemotePublication, type RemoteVersion } from './protocol';

export interface PublicationRow {
  id: string;
  slug: string;
  project_id: string;
  project_name: string;
  title: string;
  kind: 'site' | 'viewer';
  current_version: string | null;
  password_hash: string | null;
  expires_at: number | null;
  noindex: number;
  comments_enabled: number;
  revoked_at: number | null;
  created_at: number;
  updated_at: number;
}

interface VersionRow {
  id: string;
  label: string;
  source_version: string;
  file_count: number;
  bytes: number;
  created_at: number;
  committed_at: number | null;
}

export interface FileRow {
  sha256: string;
  size: number;
  content_type: string;
}

export function blobKey(publicationId: string, sha256: string): string {
  return `designs/${publicationId}/blobs/${sha256}`;
}

export function publicationById(db: D1Database, id: string): Promise<PublicationRow | null> {
  return db.prepare('SELECT * FROM publications WHERE id = ?1').bind(id).first<PublicationRow>();
}

export function publicationBySlug(db: D1Database, slug: string): Promise<PublicationRow | null> {
  return db.prepare('SELECT * FROM publications WHERE slug = ?1').bind(slug).first<PublicationRow>();
}

export function fileOf(db: D1Database, versionId: string, path: string): Promise<FileRow | null> {
  return db.prepare('SELECT sha256, size, content_type FROM files WHERE version_id = ?1 AND path = ?2').bind(versionId, path).first<FileRow>();
}

function toVersion(row: VersionRow): RemoteVersion {
  return { id: row.id, label: row.label, sourceVersion: row.source_version, fileCount: row.file_count, bytes: row.bytes, createdAt: row.created_at, committedAt: row.committed_at };
}

function dayKey(offset: number, now = Date.now()): string {
  return new Date(now - offset * 86_400_000).toISOString().slice(0, 10);
}

export async function describe(db: D1Database, row: PublicationRow): Promise<RemotePublication> {
  const [versions, days, total, comments] = await db.batch([
    db.prepare("SELECT id, label, source_version, file_count, bytes, created_at, committed_at FROM versions WHERE publication_id = ?1 AND state = 'committed' ORDER BY committed_at DESC LIMIT ?2").bind(row.id, LIMITS.versionsListed),
    db.prepare('SELECT day, views FROM daily_views WHERE publication_id = ?1 AND day >= ?2 ORDER BY day').bind(row.id, dayKey(29)),
    db.prepare('SELECT COALESCE(SUM(views), 0) AS n FROM daily_views WHERE publication_id = ?1').bind(row.id),
    db.prepare('SELECT COUNT(*) AS n FROM comments WHERE publication_id = ?1').bind(row.id),
  ]);
  const dayRows = (days?.results ?? []) as { day: string; views: number }[];
  const week = dayKey(6);
  return {
    id: row.id,
    slug: row.slug,
    projectId: row.project_id,
    projectName: row.project_name,
    title: row.title,
    kind: row.kind,
    path: `/d/${row.slug}/`,
    currentVersion: row.current_version,
    password: row.password_hash !== null,
    expiresAt: row.expires_at,
    noindex: row.noindex === 1,
    comments: row.comments_enabled === 1,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    versions: ((versions?.results ?? []) as unknown as VersionRow[]).map(toVersion),
    views: { total: Number((total?.results?.[0] as { n?: number } | undefined)?.n ?? 0), last7: dayRows.filter((d) => d.day >= week).reduce((s, d) => s + d.views, 0), days: dayRows },
    commentCount: Number((comments?.results?.[0] as { n?: number } | undefined)?.n ?? 0),
  };
}

export async function countView(db: D1Database, publicationId: string): Promise<void> {
  await db
    .prepare('INSERT INTO daily_views (publication_id, day, views) VALUES (?1, ?2, 1) ON CONFLICT (publication_id, day) DO UPDATE SET views = views + 1')
    .bind(publicationId, dayKey(0))
    .run();
}

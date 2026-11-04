import {
  LIMITS,
  PUBLICATION_ID,
  SCHEMA_VERSION,
  SHA256_HEX,
  WORKER_NAME,
  type CreatePublicationBody,
  type CreateVersionBody,
  type CreateVersionReply,
  type HealthReply,
  type ManifestFile,
  type PublicationSettings,
  type RemoteComment,
} from "@design-studio/actions/publish-remote";

import { checkKey, randomId } from "./crypto";
import { blobKey, describe, publicationById, type PublicationRow } from "./db";
import { ApiError, bad, json, notFound, readJson, type Env } from "./http";
import { sweepLimits, takeToken } from "./limits";
import { contentTypeOf, manifestPathOk } from "./paths";

type Handler = (
  request: Request,
  env: Env,
  params: string[]
) => Promise<Response>;

function text(raw: unknown, name: string, max: number): string {
  if (typeof raw !== "string") throw bad(`${name} must be a string.`);
  const value = raw.replace(/[\p{Cc}]+/gu, " ").trim();
  if (value.length === 0 || value.length > max)
    throw bad(`${name} must be 1 to ${max} characters.`);
  return value;
}

function slugOf(name: string): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32)
      .replace(/-+$/, "") || "design";
  const tail = randomId(6)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .padEnd(6, "0")
    .slice(0, 6);
  return `${base}-${tail}`;
}

async function livePublication(
  env: Env,
  id: string | undefined
): Promise<PublicationRow> {
  if (!id || !PUBLICATION_ID.test(id)) throw notFound("No such publication.");
  const row = await publicationById(env.DB, id);
  if (!row) throw notFound("No such publication.");
  if (row.revoked_at !== null)
    throw new ApiError(410, "revoked", "This publication was unpublished.");
  return row;
}

const health: Handler = async (_request, env) => {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM publications"
  ).first<{ n: number }>();
  return json({
    ok: true,
    worker: WORKER_NAME,
    schema: SCHEMA_VERSION,
    publications: row?.n ?? 0,
  } satisfies HealthReply);
};

const listPublications: Handler = async (request, env) => {
  const projectId = new URL(request.url).searchParams.get("projectId");
  const stmt = projectId
    ? env.DB.prepare(
        "SELECT * FROM publications WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 200"
      ).bind(projectId)
    : env.DB.prepare(
        "SELECT * FROM publications ORDER BY created_at DESC LIMIT 200"
      );
  const rows = (await stmt.all<PublicationRow>()).results;
  return json({
    publications: await Promise.all(rows.map((row) => describe(env.DB, row))),
  });
};

const createPublication: Handler = async (request, env) => {
  const body = await readJson<Partial<CreatePublicationBody>>(request);
  const kind =
    body.kind === "site" || body.kind === "viewer" ? body.kind : null;
  if (!kind) throw bad("kind must be site or viewer.");
  const projectId = text(body.projectId, "projectId", 64);
  const projectName = text(body.projectName, "projectName", LIMITS.titleMax);
  const title = text(body.title, "title", LIMITS.titleMax);
  const now = Date.now();
  const id = randomId(9);
  await env.DB.prepare(
    "INSERT INTO publications (id, slug, project_id, project_name, title, kind, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)"
  )
    .bind(id, slugOf(projectName), projectId, projectName, title, kind, now)
    .run();
  return json(
    await describe(
      env.DB,
      (await publicationById(env.DB, id)) as PublicationRow
    ),
    201
  );
};

function checkManifest(raw: unknown): { files: ManifestFile[]; bytes: number } {
  if (!Array.isArray(raw) || raw.length === 0)
    throw bad("files must be a list with at least one file.");
  if (raw.length > LIMITS.maxFiles)
    throw new ApiError(
      413,
      "too_many_files",
      `A version can have at most ${LIMITS.maxFiles} files.`
    );
  const seen = new Set<string>();
  let bytes = 0;
  const files = raw.map((item: Partial<ManifestFile>) => {
    const path = typeof item?.path === "string" ? item.path : "";
    if (!manifestPathOk(path) || seen.has(path))
      throw bad(
        `The file path ${path.slice(0, 80)} is not allowed.`,
        "bad_path"
      );
    if (typeof item.sha256 !== "string" || !SHA256_HEX.test(item.sha256))
      throw bad(`${path} has no valid sha256.`);
    if (
      typeof item.size !== "number" ||
      !Number.isInteger(item.size) ||
      item.size < 0
    )
      throw bad(`${path} has no valid size.`);
    if (item.size > LIMITS.maxFileBytes)
      throw new ApiError(
        413,
        "file_too_large",
        `${path} is larger than ${LIMITS.maxFileBytes / 1024 / 1024} MB.`
      );
    seen.add(path);
    bytes += item.size;
    return { path, sha256: item.sha256, size: item.size };
  });
  if (bytes > LIMITS.maxVersionBytes)
    throw new ApiError(
      413,
      "version_too_large",
      `A version can be at most ${LIMITS.maxVersionBytes / 1024 / 1024} MB.`
    );
  return { files, bytes };
}

const createVersion: Handler = async (request, env, [id]) => {
  const pub = await livePublication(env, id);
  const body = await readJson<Partial<CreateVersionBody>>(
    request,
    2 * 1024 * 1024
  );
  const { files, bytes } = checkManifest(body.files);
  const label = text(body.label ?? "Version", "label", 80);
  const sourceVersion = text(
    body.sourceVersion ?? "unknown",
    "sourceVersion",
    80
  );
  const versionId = randomId(9);
  const now = Date.now();
  const rows = JSON.stringify(
    files.map((f) => ({ ...f, type: contentTypeOf(f.path) }))
  );
  const stale = now - 3_600_000;
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM files WHERE version_id IN (SELECT id FROM versions WHERE publication_id = ?1 AND state = 'pending' AND created_at < ?2)"
    ).bind(pub.id, stale),
    env.DB.prepare(
      "DELETE FROM versions WHERE publication_id = ?1 AND state = 'pending' AND created_at < ?2"
    ).bind(pub.id, stale),
    env.DB.prepare(
      "INSERT INTO versions (id, publication_id, label, source_version, state, file_count, bytes, created_at) VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?7)"
    ).bind(versionId, pub.id, label, sourceVersion, files.length, bytes, now),
    env.DB.prepare(
      "INSERT INTO files (version_id, path, sha256, size, content_type) SELECT ?1, value ->> 'path', value ->> 'sha256', value ->> 'size', value ->> 'type' FROM json_each(?2)"
    ).bind(versionId, rows),
  ]);
  const hashes = JSON.stringify([...new Set(files.map((f) => f.sha256))]);
  const missing = await env.DB.prepare(
    "SELECT value AS sha FROM json_each(?1) WHERE value NOT IN (SELECT sha256 FROM blobs WHERE publication_id = ?2)"
  )
    .bind(hashes, pub.id)
    .all<{ sha: string }>();
  return json(
    {
      versionId,
      missing: missing.results.map((r) => r.sha),
      bytes,
    } satisfies CreateVersionReply,
    201
  );
};

const putBlob: Handler = async (request, env, [id, sha]) => {
  const pub = await livePublication(env, id);
  if (!sha || !SHA256_HEX.test(sha)) throw bad("The blob hash is not valid.");
  const length = Number(request.headers.get("content-length") ?? "-1");
  if (!Number.isInteger(length) || length < 0)
    throw new ApiError(
      411,
      "length_required",
      "Send Content-Length with the file."
    );
  if (length > LIMITS.maxFileBytes)
    throw new ApiError(
      413,
      "file_too_large",
      `A file can be at most ${LIMITS.maxFileBytes / 1024 / 1024} MB.`
    );
  const want = await env.DB.prepare(
    "SELECT f.size, f.content_type FROM files f JOIN versions v ON v.id = f.version_id WHERE v.publication_id = ?1 AND v.state = 'pending' AND f.sha256 = ?2 LIMIT 1"
  )
    .bind(pub.id, sha)
    .first<{ size: number; content_type: string }>();
  if (!want)
    throw new ApiError(
      409,
      "not_expected",
      "No pending version lists this file. Send the manifest first."
    );
  if (want.size !== length)
    throw bad("The file size does not match the manifest.", "size_mismatch");
  const known = await env.DB.prepare(
    "SELECT 1 AS y FROM blobs WHERE publication_id = ?1 AND sha256 = ?2"
  )
    .bind(pub.id, sha)
    .first();
  if (known) return json({ sha256: sha, stored: false });
  if (!request.body && length > 0) throw bad("The file body is empty.");
  try {
    await env.FILES.put(
      blobKey(pub.id, sha),
      request.body ?? new Uint8Array(0),
      { sha256: sha, httpMetadata: { contentType: want.content_type } }
    );
  } catch (error) {
    throw bad(
      `R2 refused the file: ${error instanceof Error ? error.message.slice(0, 160) : "checksum or size mismatch"}`,
      "upload_failed"
    );
  }
  await env.DB.prepare(
    "INSERT INTO blobs (publication_id, sha256, size, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT DO NOTHING"
  )
    .bind(pub.id, sha, length, Date.now())
    .run();
  return json({ sha256: sha, stored: true }, 201);
};

function settingsSql(raw: PublicationSettings): {
  sql: string[];
  values: unknown[];
} {
  const sql: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown) => {
    values.push(value);
    sql.push(`${column} = ?${values.length + 2}`);
  };
  if (raw.title !== undefined)
    add("title", text(raw.title, "title", LIMITS.titleMax));
  if (raw.passwordHash !== undefined) {
    if (
      raw.passwordHash !== null &&
      !/^pbkdf2-sha256\$\d{4,7}\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(
        raw.passwordHash
      )
    )
      throw bad("passwordHash is not valid.");
    add("password_hash", raw.passwordHash);
  }
  if (raw.expiresAt !== undefined) {
    if (
      raw.expiresAt !== null &&
      (typeof raw.expiresAt !== "number" || !Number.isFinite(raw.expiresAt))
    )
      throw bad("expiresAt must be a time in ms or null.");
    add(
      "expires_at",
      raw.expiresAt === null ? null : Math.floor(raw.expiresAt)
    );
  }
  if (raw.noindex !== undefined) add("noindex", raw.noindex ? 1 : 0);
  if (raw.comments !== undefined) add("comments_enabled", raw.comments ? 1 : 0);
  return { sql, values };
}

const commitVersion: Handler = async (request, env, [id, vid]) => {
  const pub = await livePublication(env, id);
  const settings = settingsSql(await readJson<PublicationSettings>(request));
  const version = await env.DB.prepare(
    "SELECT state FROM versions WHERE id = ?1 AND publication_id = ?2"
  )
    .bind(vid ?? "", pub.id)
    .first<{ state: string }>();
  if (!version) throw notFound("No such version.");
  if (version.state !== "pending")
    throw new ApiError(
      409,
      "already_committed",
      "This version is already live."
    );
  const gap = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM files f WHERE f.version_id = ?1 AND NOT EXISTS (SELECT 1 FROM blobs b WHERE b.publication_id = ?2 AND b.sha256 = f.sha256)"
  )
    .bind(vid, pub.id)
    .first<{ n: number }>();
  if ((gap?.n ?? 0) > 0)
    throw new ApiError(
      409,
      "missing_files",
      `${gap?.n} files are not uploaded yet.`
    );
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE versions SET state = 'committed', committed_at = ?1 WHERE id = ?2 AND state = 'pending'"
    ).bind(now, vid),
    env.DB.prepare(
      `UPDATE publications SET ${["current_version = ?1", "updated_at = ?2", ...settings.sql].join(", ")} WHERE id = ?${settings.values.length + 3}`
    ).bind(vid, now, ...settings.values, pub.id),
  ]);
  return json(
    await describe(
      env.DB,
      (await publicationById(env.DB, pub.id)) as PublicationRow
    )
  );
};

const rollback: Handler = async (request, env, [id]) => {
  const pub = await livePublication(env, id);
  const body = await readJson<{ versionId?: unknown }>(request);
  const version = await env.DB.prepare(
    "SELECT id FROM versions WHERE id = ?1 AND publication_id = ?2 AND state = 'committed'"
  )
    .bind(typeof body.versionId === "string" ? body.versionId : "", pub.id)
    .first<{ id: string }>();
  if (!version) throw notFound("No such published version.");
  await env.DB.prepare(
    "UPDATE publications SET current_version = ?1, updated_at = ?2 WHERE id = ?3"
  )
    .bind(version.id, Date.now(), pub.id)
    .run();
  return json(
    await describe(
      env.DB,
      (await publicationById(env.DB, pub.id)) as PublicationRow
    )
  );
};

async function deletePrefix(bucket: R2Bucket, prefix: string): Promise<number> {
  let removed = 0;
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    if (page.objects.length > 0)
      await bucket.delete(page.objects.map((o) => o.key));
    removed += page.objects.length;
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return removed;
}

const revoke: Handler = async (_request, env, [id]) => {
  if (!id || !PUBLICATION_ID.test(id)) throw notFound("No such publication.");
  const pub = await publicationById(env.DB, id);
  if (!pub) throw notFound("No such publication.");
  const now = Date.now();
  if (pub.revoked_at === null)
    await env.DB.prepare(
      "UPDATE publications SET revoked_at = ?1, updated_at = ?1 WHERE id = ?2"
    )
      .bind(now, pub.id)
      .run();
  const removed = await deletePrefix(env.FILES, `designs/${pub.id}/`);
  await env.DB.prepare("DELETE FROM blobs WHERE publication_id = ?1")
    .bind(pub.id)
    .run();
  return json({
    publication: await describe(
      env.DB,
      (await publicationById(env.DB, pub.id)) as PublicationRow
    ),
    removedFiles: removed,
  });
};

const listComments: Handler = async (_request, env, [id]) => {
  if (!id || !PUBLICATION_ID.test(id)) throw notFound("No such publication.");
  const rows = await env.DB.prepare(
    "SELECT id, author, body, created_at FROM comments WHERE publication_id = ?1 ORDER BY created_at DESC LIMIT 200"
  )
    .bind(id)
    .all<{ id: string; author: string; body: string; created_at: number }>();
  return json({
    comments: rows.results.map(
      (r) =>
        ({
          id: r.id,
          author: r.author,
          body: r.body,
          createdAt: r.created_at,
        }) satisfies RemoteComment
    ),
  });
};

const deleteComment: Handler = async (_request, env, [id, cid]) => {
  const out = await env.DB.prepare(
    "DELETE FROM comments WHERE id = ?1 AND publication_id = ?2"
  )
    .bind(cid ?? "", id ?? "")
    .run();
  if (!out.meta.changes) throw notFound("No such comment.");
  return json({ deleted: cid });
};

const ROUTES: [string, RegExp, Handler][] = [
  ["GET", /^\/api\/health$/, health],
  ["GET", /^\/api\/publications$/, listPublications],
  ["POST", /^\/api\/publications$/, createPublication],
  ["POST", /^\/api\/publications\/([^/]+)\/versions$/, createVersion],
  ["PUT", /^\/api\/publications\/([^/]+)\/blobs\/([^/]+)$/, putBlob],
  [
    "POST",
    /^\/api\/publications\/([^/]+)\/versions\/([^/]+)\/commit$/,
    commitVersion,
  ],
  ["POST", /^\/api\/publications\/([^/]+)\/rollback$/, rollback],
  ["POST", /^\/api\/publications\/([^/]+)\/revoke$/, revoke],
  ["GET", /^\/api\/publications\/([^/]+)\/comments$/, listComments],
  [
    "DELETE",
    /^\/api\/publications\/([^/]+)\/comments\/([^/]+)$/,
    deleteComment,
  ],
];

export async function handleApi(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const path = new URL(request.url).pathname;
  const matches = ROUTES.filter(([, pattern]) => pattern.test(path));
  if (matches.length === 0) throw notFound("No such API route.");
  const route = matches.find(([method]) => method === request.method);
  if (!route)
    throw new ApiError(
      405,
      "method_not_allowed",
      "This method is not allowed here.",
      { allow: matches.map(([m]) => m).join(", ") }
    );
  await checkKey(request, env.PUBLISH_KEY_HASH);
  await takeToken(
    env.DB,
    `api:${env.PUBLISH_KEY_HASH.slice(0, 16)}`,
    LIMITS.apiPerMinute,
    60_000,
    "Too many publish requests. Wait a minute."
  );
  if (Math.random() < 0.02) ctx.waitUntil(sweepLimits(env.DB));
  const params = (route[1].exec(path) ?? [])
    .slice(1)
    .map((p) => decodeURIComponent(p));
  return route[2](request, env, params);
}

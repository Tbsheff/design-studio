import { revokeLive } from "./share/revoke.js";
import { toBlobKey } from "./tenant/blob-key.js";

interface CronEnv {
  readonly DB: D1Database;
  readonly FILES: R2Bucket;
}

interface ExpiredShare {
  readonly id: string;
  readonly org_id: string;
}

interface ZeroBlob {
  readonly id: string;
  readonly org_id: string;
}

const BATCH = 100;

const GRACE_MS = 86_400_000;

const expireShares = async (db: D1Database, now: number): Promise<number> => {
  const due = await db
    .prepare(
      "SELECT s.org_id, s.id FROM share s WHERE s.expires_at IS NOT NULL AND s.expires_at <= ?1 AND s.revoked_at IS NULL ORDER BY s.org_id, s.id LIMIT ?2"
    )
    .bind(now, BATCH)
    .all<ExpiredShare>();

  await Promise.all(
    due.results.map(async (share) => {
      await db
        .prepare(
          "UPDATE share SET revoked_at = ?1, revoked_by = 'cron', rev = rev + 1 WHERE org_id = ?2 AND id = ?3 AND revoked_at IS NULL"
        )
        .bind(now, share.org_id, share.id)
        .run();
      await revokeLive(share.org_id, share.id);
    })
  );

  return due.results.length;
};

const expirePublications = async (
  db: D1Database,
  now: number
): Promise<number> => {
  const result = await db
    .prepare(
      "UPDATE publication SET deleted_at = ?1, updated_at = ?1, rev = rev + 1 WHERE expires_at IS NOT NULL AND expires_at <= ?1 AND deleted_at IS NULL"
    )
    .bind(now)
    .run();

  return result.meta.changes;
};

const markZeroBlobs = async (db: D1Database, now: number): Promise<void> => {
  await db
    .prepare(
      "UPDATE blob_ref SET zero_at = ?1 WHERE refcount = 0 AND zero_at IS NULL"
    )
    .bind(now)
    .run();
};

const dropBlob = async (
  env: CronEnv,
  blob: ZeroBlob,
  cutoff: number
): Promise<boolean> => {
  const removed = await env.DB.prepare(
    "DELETE FROM blob_ref WHERE org_id = ?1 AND id = ?2 AND refcount = 0 AND zero_at IS NOT NULL AND zero_at <= ?3 AND NOT EXISTS (SELECT 1 FROM version_file f WHERE f.org_id = ?1 AND f.blob_id = ?2) AND NOT EXISTS (SELECT 1 FROM publication_file p WHERE p.org_id = ?1 AND p.blob_id = ?2)"
  )
    .bind(blob.org_id, blob.id, cutoff)
    .run();

  if (removed.meta.changes !== 1) {
    return false;
  }

  const key = toBlobKey(blob.org_id, { kind: "blob", name: blob.id });

  if (key !== null) {
    await env.FILES.delete(key);
  }

  return true;
};

const collectBlobs = async (env: CronEnv, now: number): Promise<number> => {
  await markZeroBlobs(env.DB, now);
  const cutoff = now - GRACE_MS;

  const zero = await env.DB.prepare(
    "SELECT org_id, id FROM blob_ref WHERE refcount = 0 AND zero_at IS NOT NULL AND zero_at <= ?1 ORDER BY org_id, id LIMIT ?2"
  )
    .bind(cutoff, BATCH)
    .all<ZeroBlob>();

  const outcomes = await Promise.all(
    zero.results.map(async (blob) => await dropBlob(env, blob, cutoff))
  );

  return outcomes.filter(Boolean).length;
};

const runHourly = async (env: CronEnv, now: number): Promise<void> => {
  await expireShares(env.DB, now);
  await expirePublications(env.DB, now);
  await collectBlobs(env, now);
};

export { collectBlobs, expirePublications, expireShares, runHourly };

export type { CronEnv };

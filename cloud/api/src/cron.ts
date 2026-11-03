import { Effect } from "effect";

import { ShareLiveClient } from "./platform/share-live-client.js";
import { TenantBlobs } from "./tenant/blobs.js";
import { SweepDb } from "./tenant/sweep-db.js";

const GRACE_MS = 86_400_000;

const runHourly = Effect.fn("Cron.runHourly")(function* run(now: number) {
  const sweep = yield* SweepDb;
  const live = yield* ShareLiveClient;
  const blobs = yield* TenantBlobs;
  const revoked = yield* sweep.expireShares(now);

  yield* Effect.all(
    revoked.map((share) => live.revoke(share.orgId, share.id)),
    { discard: true }
  );
  yield* sweep.expirePublications(now);
  yield* sweep.markZeroBlobs(now);

  const dropped = yield* sweep.dropZeroBlobs(now - GRACE_MS);

  yield* Effect.all(
    dropped.map((blob) => blobs.deleteSwept(blob)),
    { discard: true }
  );
});

export { runHourly };

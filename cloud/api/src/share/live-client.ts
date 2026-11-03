import { env } from "cloudflare:workers";

import type { ShareLive } from "./share-live.js";

const toShareLiveName = (orgId: string, shareId: string): string =>
  `${orgId}:${shareId}`;

const getShareLive = (
  orgId: string,
  shareId: string
): DurableObjectStub<ShareLive> =>
  env.SHARE_LIVE.get(
    env.SHARE_LIVE.idFromName(toShareLiveName(orgId, shareId))
  );

export { getShareLive, toShareLiveName };

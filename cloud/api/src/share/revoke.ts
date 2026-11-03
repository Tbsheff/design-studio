import { getShareLive } from "./live-client.js";

const revokeLive = async (orgId: string, shareId: string): Promise<number> =>
  await getShareLive(orgId, shareId).revoke();

export { revokeLive };

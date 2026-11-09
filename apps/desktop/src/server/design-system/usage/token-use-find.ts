import { createBoundedCache } from "./deps.js";
import { toTokenUses, toUsageIndex } from "./engine/index.js";
import type { TokenUse, UsageToken } from "./engine/index.js";
import { listScannedFiles } from "./token-usage-files.js";
import type { ScanCache } from "./token-usage-files.js";

const MAX_SCANNED_FILES = 60_000;

const getTokenUse = async (
  workTree: string,
  tokens: readonly UsageToken[],
  name: string
): Promise<TokenUse | null> => {
  const index = toUsageIndex(tokens);
  const cache: ScanCache = createBoundedCache(MAX_SCANNED_FILES);
  const files = await listScannedFiles(cache, workTree, index);
  const uses = toTokenUses(tokens, files);

  return uses.find((use) => use.name === name) ?? null;
};

export { getTokenUse };

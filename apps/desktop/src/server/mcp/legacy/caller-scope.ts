import { AsyncLocalStorage } from "node:async_hooks";

import { Effect } from "effect";

import type { Principal } from "../../store/index.js";
import { readProjectOrg, toLegacyPrincipal } from "../../store/index.js";

type FolderRootsLookup = () => Promise<readonly string[] | null>;

interface LegacyCall {
  readonly folderRoots: FolderRootsLookup | null;
  readonly principal: Principal;
}

const callerStore = new AsyncLocalStorage<LegacyCall>();

const withLegacyCaller = <Result>(
  call: LegacyCall,
  run: () => Promise<Result>
): Promise<Result> => callerStore.run(call, run);

const legacyCaller = (): Principal =>
  callerStore.getStore()?.principal ?? toLegacyPrincipal();

const lookupProjectOrg = (projectId: string): Promise<string | null> =>
  Effect.runPromise(readProjectOrg(projectId));

const lookupFolderRoots = (): Promise<readonly string[] | null> => {
  const folderRoots = callerStore.getStore()?.folderRoots ?? null;

  if (folderRoots === null) {
    return Promise.resolve(null);
  }

  return folderRoots();
};

export { legacyCaller, lookupFolderRoots, lookupProjectOrg, withLegacyCaller };

export type { FolderRootsLookup, LegacyCall };

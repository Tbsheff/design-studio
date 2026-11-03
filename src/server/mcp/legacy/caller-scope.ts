import { AsyncLocalStorage } from "node:async_hooks";

import type { Principal } from "../../store/principal.js";
import { toLegacyPrincipal } from "../../store/principal.js";
import { readProjectOrg } from "../../store/project-org.js";

type ProjectOrgLookup = (projectId: string) => Promise<string | null>;

type FolderRootsLookup = (orgId: string) => readonly string[] | null;

const callerStore = new AsyncLocalStorage<Principal>();

let projectOrgLookup: ProjectOrgLookup | null = null;
let folderRootsLookup: FolderRootsLookup | null = null;

const withLegacyCaller = <Result>(
  principal: Principal,
  run: () => Promise<Result>
): Promise<Result> => callerStore.run(principal, run);

const legacyCaller = (): Principal =>
  callerStore.getStore() ?? toLegacyPrincipal();

const setProjectOrgLookup = (lookup: ProjectOrgLookup | null): void => {
  projectOrgLookup = lookup;
};

const setFolderRootsLookup = (lookup: FolderRootsLookup | null): void => {
  folderRootsLookup = lookup;
};

const lookupProjectOrg = (projectId: string): Promise<string | null> => {
  if (projectOrgLookup === null) {
    return readProjectOrg(projectId);
  }

  return projectOrgLookup(projectId);
};

const lookupFolderRoots = (orgId: string): readonly string[] | null => {
  if (folderRootsLookup === null) {
    return null;
  }

  return folderRootsLookup(orgId);
};

export {
  legacyCaller,
  lookupFolderRoots,
  lookupProjectOrg,
  setFolderRootsLookup,
  setProjectOrgLookup,
  withLegacyCaller,
};

export type { FolderRootsLookup, ProjectOrgLookup };

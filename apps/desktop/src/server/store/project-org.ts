import path from "node:path";

import { Effect } from "effect";

import { BindingsFileSchema } from "../../shared/cloud-contracts.js";
import type { BindingsFile } from "../../shared/cloud-contracts.js";
import { loadConfig } from "../platform/config/index.js";
import { toJsonFileReader } from "../platform/local-file/index.js";
import { isOrgInScope } from "./org-scope.js";
import type { OrgScope } from "./org-scope.js";
import { LOCAL_ORG_ID } from "./org-visibility.js";

type ProjectOrgs = ReadonlyMap<string, string>;

const BINDINGS_FILE = "bindings.json";

const readBindingsFile = toJsonFileReader(BindingsFileSchema);

const toProjectOrgs = (file: BindingsFile | null): ProjectOrgs => {
  const orgs = new Map<string, string>();

  for (const [keyText, binding] of Object.entries(file?.bindings ?? {})) {
    if (keyText.startsWith(`${binding.orgId}:`)) {
      orgs.set(keyText.slice(binding.orgId.length + 1), binding.orgId);
    }
  }

  return orgs;
};

const readProjectOrgs = Effect.fn("ProjectOrg.readProjectOrgs")(
  function* run() {
    const file = yield* readBindingsFile(
      path.join(loadConfig().dataDir, BINDINGS_FILE)
    ).pipe(Effect.catchDefect(() => Effect.succeed(null)));

    return toProjectOrgs(file);
  }
);

const readProjectOrg = Effect.fn("ProjectOrg.readProjectOrg")(function* run(
  projectId: string
) {
  const orgs = yield* readProjectOrgs();

  return orgs.get(projectId) ?? null;
});

const isProjectVisible = (
  scope: OrgScope,
  orgs: ProjectOrgs,
  projectId: string
): boolean => isOrgInScope(scope, orgs.get(projectId) ?? LOCAL_ORG_ID);

const toVisibleProjects = <Item extends { readonly id: string }>(
  scope: OrgScope,
  orgs: ProjectOrgs,
  items: readonly Item[]
): Item[] => items.filter((item) => isProjectVisible(scope, orgs, item.id));

export { isProjectVisible, readProjectOrg, readProjectOrgs, toVisibleProjects };

export type { ProjectOrgs };

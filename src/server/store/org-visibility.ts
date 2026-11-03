import { LOCAL_ORG_ID, readOrgOfProject } from "./bindings.js";
import { isOrgInScope, toOrgScope } from "./org-scope.js";
import type { OrgScope } from "./org-scope.js";
import type {
  KeyPrincipal,
  LegacyPrincipal,
  Principal,
  UiPrincipal,
} from "./principal.js";

const toUiPrincipal = (userId: string | null): UiPrincipal => ({
  kind: "ui",
  userId,
});

const toKeyPrincipal = (key: Omit<KeyPrincipal, "kind">): KeyPrincipal => ({
  ...key,
  kind: "key",
});

const toSignedOutPrincipal = (): LegacyPrincipal => ({ kind: "legacy" });

const isSignedIn = (principal: Principal): boolean => {
  if (principal.kind === "ui") {
    return principal.userId !== null;
  }

  return principal.kind === "key";
};

const toPrincipalScope = (
  principal: Principal,
  memberOrgIds: readonly string[] = []
): OrgScope => {
  if (principal.kind === "key") {
    return { kind: "orgs", orgIds: [principal.orgId] };
  }

  if (principal.kind === "ui") {
    return { kind: "orgs", orgIds: [...memberOrgIds, LOCAL_ORG_ID] };
  }

  return toOrgScope(principal);
};

const toSignedInLegacyScope = (): OrgScope => ({
  kind: "orgs",
  orgIds: [LOCAL_ORG_ID],
});

const orgOfProject = (
  pid: string,
  dataDir: string | null = null
): Promise<string | null> => readOrgOfProject(pid, dataDir);

const isProjectInScope = async (
  scope: OrgScope,
  pid: string,
  dataDir: string | null = null
): Promise<boolean> => {
  const orgId = await orgOfProject(pid, dataDir);

  if (orgId === null) {
    return scope.kind === "all";
  }

  return isOrgInScope(scope, orgId);
};

export { isOrgInScope } from "./org-scope.js";

export {
  isProjectInScope,
  isSignedIn,
  orgOfProject,
  toKeyPrincipal,
  toPrincipalScope,
  toSignedInLegacyScope,
  toSignedOutPrincipal,
  toUiPrincipal,
};

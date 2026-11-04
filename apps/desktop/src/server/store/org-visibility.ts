import { toOrgScope } from "./org-scope.js";
import type { OrgScope } from "./org-scope.js";
import type { Principal } from "./principal.js";

const LOCAL_ORG_ID = "local";

const toPrincipalScope = (
  principal: Principal,
  memberOrgIds: readonly string[]
): OrgScope => {
  if (principal.kind === "ui") {
    return { kind: "orgs", orgIds: [...memberOrgIds, LOCAL_ORG_ID] };
  }

  return toOrgScope(principal);
};

export { LOCAL_ORG_ID, toPrincipalScope };

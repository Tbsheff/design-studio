import { Context, Layer } from "effect";

import { toLegacyPrincipal } from "./local-principal.js";
import type { Principal } from "./local-principal.js";

interface EveryOrg {
  readonly kind: "all";
}

interface SomeOrgs {
  readonly kind: "orgs";
  readonly orgIds: readonly string[];
}

type OrgScope = EveryOrg | SomeOrgs;

const EVERY_ORG: EveryOrg = { kind: "all" };

const scopeOf = (principal: Principal): OrgScope => {
  if (principal.kind === "key") {
    return { kind: "orgs", orgIds: [principal.orgId] };
  }

  return EVERY_ORG;
};

const isOrgInScope = (scope: OrgScope, orgId: string): boolean => {
  if (scope.kind === "all") {
    return true;
  }

  return scope.orgIds.includes(orgId);
};

class LocalOrgScope extends Context.Service<LocalOrgScope, OrgScope>()(
  "design-studio/store/LocalOrgScope"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    LocalOrgScope,
    scopeOf(toLegacyPrincipal())
  );
}

export { LocalOrgScope, isOrgInScope, scopeOf };

export type { EveryOrg, OrgScope, SomeOrgs };

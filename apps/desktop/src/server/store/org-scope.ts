import type { Principal } from "./principal.js";

interface EveryOrg {
  readonly kind: "all";
}

interface SomeOrgs {
  readonly kind: "orgs";
  readonly orgIds: readonly string[];
}

type OrgScope = EveryOrg | SomeOrgs;

const EVERY_ORG: EveryOrg = { kind: "all" };

const toOrgScope = (principal: Principal): OrgScope => {
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

export { isOrgInScope, toOrgScope };

export type { EveryOrg, OrgScope, SomeOrgs };

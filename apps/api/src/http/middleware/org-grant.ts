import type { Permission } from "@design-studio/actions/_core/permissions";
import { ROLE_GRANTS, toPermissions } from "../../auth/permissions.js";
import type { RoleName } from "../../auth/permissions.js";
import type { OrgRole } from "../../tenant/current-org.js";

interface OrgGrant {
  readonly perms: readonly Permission[];
  readonly role: OrgRole;
}

const ROLE_ORDER: readonly OrgRole[] = ["owner", "admin", "member"];

const ROLE_NAMES: readonly RoleName[] = ["owner", "admin", "member", "viewer"];

const isRoleName = (name: string): name is RoleName =>
  ROLE_NAMES.some((known) => known === name);

const toRoleNames = (roleText: string): readonly RoleName[] =>
  roleText
    .split(",")
    .map((part) => part.trim())
    .filter((part) => isRoleName(part));

const toOrgGrant = (roleText: string | null): OrgGrant | null => {
  if (roleText === null) {
    return null;
  }

  const names = toRoleNames(roleText);
  const role = ROLE_ORDER.find((known) => names.includes(known)) ?? null;

  if (role === null) {
    return null;
  }

  const perms = [
    ...new Set(names.flatMap((name) => toPermissions(ROLE_GRANTS[name]))),
  ];

  return { perms, role };
};

const toKeyPermissions = (
  grants: Readonly<Record<string, readonly string[]>> | null
): ReadonlySet<string> =>
  new Set(
    Object.entries(grants ?? {}).flatMap(([resource, actions]) =>
      actions.map((action) => `${resource}.${action}`)
    )
  );

const toKeyGrant = (
  grant: OrgGrant,
  grants: Readonly<Record<string, readonly string[]>> | null
): OrgGrant => {
  const allowed = toKeyPermissions(grants);

  return {
    perms: grant.perms.filter((perm) => allowed.has(perm)),
    role: grant.role,
  };
};

export { toKeyGrant, toOrgGrant };

export type { OrgGrant };

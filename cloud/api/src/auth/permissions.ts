import type { Permission } from "../../../../src/shared/actions/_core/permissions.js";

const STATEMENTS = {
  apiKey: ["create", "revoke"],
  comment: ["delete", "read", "resolve", "write"],
  design_rules: ["write"],
  member: ["invite", "remove", "setRole"],
  org: ["billing", "delete", "transfer", "update"],
  pack: ["read", "write"],
  policy: ["set"],
  project: ["create", "delete", "publish", "read", "share", "update"],
  publication: ["delete", "read", "update"],
  share: ["revoke"],
  studio: ["read"],
} as const;

type Statements = typeof STATEMENTS;

type Resource = keyof Statements;

type StatementPermission = {
  readonly [Key in Resource]: `${Key}.${Statements[Key][number]}`;
}[Resource];

type RoleName = "admin" | "member" | "owner" | "viewer";

type RoleGrant = {
  readonly [Key in Resource]?: readonly Statements[Key][number][];
};

type IsSame<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : false
  : false;

const PERMISSIONS_MATCH: IsSame<StatementPermission, Permission> = true;

const PERMISSIONS: readonly Permission[] = Object.entries(STATEMENTS).flatMap(
  ([resource, actions]) =>
    actions.map((action) => `${resource}.${action}` as Permission)
);

const OWNER_GRANT: RoleGrant = STATEMENTS;

const ADMIN_GRANT: RoleGrant = {
  ...STATEMENTS,
  org: ["update"],
};

const MEMBER_GRANT: RoleGrant = {
  apiKey: ["create", "revoke"],
  comment: ["read", "resolve", "write"],
  pack: ["read"],
  project: ["create", "read", "share", "update"],
  publication: ["read"],
  share: ["revoke"],
  studio: ["read"],
};

const VIEWER_GRANT: RoleGrant = {
  comment: ["read", "write"],
  pack: ["read"],
  project: ["read"],
  publication: ["read"],
  studio: ["read"],
};

const ROLE_GRANTS: Readonly<Record<RoleName, RoleGrant>> = {
  admin: ADMIN_GRANT,
  member: MEMBER_GRANT,
  owner: OWNER_GRANT,
  viewer: VIEWER_GRANT,
};

const toPermissions = (grant: RoleGrant): readonly Permission[] =>
  Object.entries(grant).flatMap(([resource, actions]) =>
    (actions ?? []).map((action) => `${resource}.${action}` as Permission)
  );

export {
  PERMISSIONS,
  PERMISSIONS_MATCH,
  ROLE_GRANTS,
  STATEMENTS,
  toPermissions,
};

export type { Resource, RoleGrant, RoleName, StatementPermission, Statements };

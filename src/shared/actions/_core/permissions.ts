const CONFIRM_PERMISSIONS = [
  "project.delete",
  "project.publish",
  "project.share",
  "publication.delete",
  "publication.update",
] as const;

const PERMISSIONS = [
  ...CONFIRM_PERMISSIONS,
  "apiKey.create",
  "apiKey.revoke",
  "comment.delete",
  "comment.read",
  "comment.resolve",
  "comment.write",
  "design_rules.write",
  "member.invite",
  "member.remove",
  "member.setRole",
  "org.billing",
  "org.delete",
  "org.transfer",
  "org.update",
  "pack.read",
  "pack.write",
  "policy.set",
  "project.create",
  "project.read",
  "project.update",
  "publication.read",
  "share.revoke",
  "studio.read",
] as const;

type ConfirmPermission = (typeof CONFIRM_PERMISSIONS)[number];

type Permission = (typeof PERMISSIONS)[number];

export { CONFIRM_PERMISSIONS, PERMISSIONS };

export type { ConfirmPermission, Permission };

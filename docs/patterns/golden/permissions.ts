const CONFIRM_PERMISSIONS = [
  "project.delete",
  "project.publish",
  "project.share",
  "publication.delete",
  "publication.update",
] as const;

type ConfirmPermission = (typeof CONFIRM_PERMISSIONS)[number];

type Permission =
  | ConfirmPermission
  | "comment.read"
  | "comment.write"
  | "pack.read"
  | "pack.write"
  | "project.create"
  | "project.read"
  | "project.update"
  | "publication.read"
  | "studio.read";

export { CONFIRM_PERMISSIONS };

export type { ConfirmPermission, Permission };

interface CloudRef {
  orgId: string;
  pid: string;
  sig: string;
}

interface ProjectBinding {
  orgId: string;
  cloudRef: CloudRef | null;
  workTree: string;
  appDir: string | null;
  sourcePath: string | null;
  env: Record<string, string>;
  attachmentPaths: Record<string, string>;
}

interface BindingsFile {
  version: 1;
  bindings: Record<string, ProjectBinding>;
}

interface AccountFile {
  userId: string;
  personalOrgId: string;
  deviceId: string;
}

type MigrationStep = "project" | "directions" | "attachments" | "app";

const MIGRATION_STEPS: readonly MigrationStep[] = [
  "project",
  "directions",
  "attachments",
  "app",
];

interface MigrationState {
  version: 1;
  projects: Record<string, Partial<Record<MigrationStep, number>>>;
  bindingsDone: boolean;
}

interface OrgPick {
  orgId: string;
  name: string;
  role: "owner" | "admin" | "member";
  personal: boolean;
}

interface SignInOrgList {
  orgs: OrgPick[];
  activeOrgId: string | null;
}

interface ProjectSyncToggle {
  projectId: string;
  sync: boolean;
}

interface ProjectSyncStatus {
  projectId: string;
  sync: boolean;
  orgId: string | null;
  cloudRef: CloudRef | null;
}

export { MIGRATION_STEPS };

export type {
  AccountFile,
  BindingsFile,
  CloudRef,
  MigrationState,
  MigrationStep,
  OrgPick,
  ProjectBinding,
  ProjectSyncStatus,
  ProjectSyncToggle,
  SignInOrgList,
};

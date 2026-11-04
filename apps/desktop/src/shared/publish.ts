import type { ExportFrame } from "@design-studio/contracts/export";

export const CF_MIN_VERSION = "1.0.0-beta.26";
export const CF_INSTALL_COMMAND = "npm i -g cf";

export const CF_NODE_RANGE =
  "Node.js 22.23, 24.22 or 26.12 or later in that line";

export const PUBLISH_EXPIRY_DAYS = [0, 1, 7, 30] as const;

export type PublishExpiryDays = (typeof PUBLISH_EXPIRY_DAYS)[number];

export const PUBLISH_DEFAULT_EXPIRY_DAYS: PublishExpiryDays = 7;
export const PUBLISH_PASSWORD_MIN = 8;
export const PUBLISH_PASSWORD_MAX = 128;
export const PUBLISH_MAX_FILES = 2000;
export const PUBLISH_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const PUBLISH_MAX_BYTES = 100 * 1024 * 1024;
export const PUBLISH_MAX_FRAMES = 12;

export type PublishKind = "site" | "viewer";

export interface PublishAccount {
  id: string;
  name: string;
}

export interface PublishLoginState {
  running: boolean;
  url: string | null;
  error: string | null;
}

export interface PublishCliState {
  installed: boolean;
  version: string | null;
  minVersion: string;
  versionOk: boolean;
  installCommand: string;
  signedIn: boolean;
  email: string | null;
  accounts: PublishAccount[];
  accountId: string | null;
  subdomain: string | null;
  keyring: boolean;
  login: PublishLoginState;
  error: string | null;
}

export interface PublishPlanInput {
  directionId?: string;
  versionId?: string;
  frames?: ExportFrame[];
  frameIds?: string[];
  title?: string;
  password?: string;
  keepPassword?: boolean;
  expiresInDays?: PublishExpiryDays;
  comments?: boolean;
  viewerComments?: boolean;
  noindex?: boolean;
  publicationId?: string;
}

export interface PublishPlan {
  id: string;
  projectId: string;
  directionId: string;
  versionId: string;
  kind: PublishKind;
  title: string;
  url: string | null;
  urlPattern: string;
  pages: string[];
  fileCount: number;
  bytes: number;
  changedFiles: number | null;
  password: boolean;
  expiresAt: number | null;
  comments: number;
  viewerComments: boolean;
  noindex: boolean;
  warnings: string[];
  createdAt: number;
  planExpiresAt: number;
  republishOf: string | null;
  backend: PublishBackendMode;
}

export type PublicationStatus =
  | "publishing"
  | "live"
  | "failed"
  | "removed"
  | "ended";

export interface PublishedVersion {
  id: string;
  label: string;
  sourceVersion: string;
  fileCount: number;
  bytes: number;
  committedAt: number | null;
  live: boolean;
}

export interface PublicationViews {
  total: number;
  last7: number;
  days: { day: string; views: number }[];
}

export interface Publication {
  id: string;
  projectId: string;
  directionId: string;
  versionId: string;
  kind: PublishKind;
  title: string;
  backend: "app" | "legacy-worker";
  isLegacy: boolean;
  workerName: string | null;
  accountId: string | null;
  url: string | null;
  commentsUrl: string | null;
  pages: string[];
  fileCount: number;
  bytes: number;
  password: boolean;
  expiresAt: number | null;
  noindex: boolean;
  viewerComments: boolean;
  createdAt: number;
  updatedAt: number;
  status: PublicationStatus;
  error: string | null;
  log: string;
  versions: PublishedVersion[];
  views: PublicationViews | null;
  commentCount: number;
  lastUpload: { sent: number; reused: number } | null;
}

export interface PublicationList {
  publications: Publication[];
  backendError: string | null;
}

export interface PublicationComment {
  id: string;
  author: string;
  body: string;
  createdAt: number;
}

export type PublishBackendMode = "cloudflare" | "local";

export type SetupStepId =
  | "cli"
  | "bucket"
  | "database"
  | "migrations"
  | "key"
  | "deploy"
  | "health";

export type SetupStepStatus =
  | "pending"
  | "running"
  | "done"
  | "skipped"
  | "failed";

export interface SetupStep {
  id: SetupStepId;
  label: string;
  status: SetupStepStatus;
  command: string | null;
  detail: string | null;
}

export interface PublishBackendState {
  mode: PublishBackendMode | null;
  ready: boolean;
  url: string | null;
  accountId: string | null;
  databaseId: string | null;
  keyStore: "keychain" | "file" | null;
  localAllowed: boolean;
  running: boolean;
  steps: SetupStep[];
  setUpAt: number | null;
  error: string | null;
}

export function publishSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function publishExpiryText(
  expiresAt: number | null,
  now = Date.now()
): string {
  if (expiresAt === null) {
    return "No end date";
  }

  const left = expiresAt - now;

  if (left <= 0) {
    return "Ended";
  }

  const days = Math.round(left / 86_400_000);

  if (days >= 2) {
    return `Ends in ${days} days`;
  }

  const hours = Math.max(1, Math.round(left / 3_600_000));

  return `Ends in ${hours} h`;
}

interface CfVersionParts {
  core: number[];
  pre: string[];
}

function splitVersion(v: string): CfVersionParts {
  const [core = "", pre = ""] = v.trim().replace(/^v/, "").split("-", 2);

  return {
    core: core.split(".").map((n) => Number(n) || 0),
    pre: pre ? pre.split(".") : [],
  };
}

function comparePart(p: string, q: string): number {
  const pn = Number(p);
  const qn = Number(q);

  return Math.sign(
    Number.isFinite(pn) && Number.isFinite(qn) ? pn - qn : p.localeCompare(q)
  );
}

function comparePre(x: string[], y: string[]): number {
  if (x.length === 0 || y.length === 0) {
    return y.length - x.length === 0 ? 0 : x.length === 0 ? 1 : -1;
  }

  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const p = x[i];
    const q = y[i];

    if (p === undefined || q === undefined) {
      return p === undefined ? -1 : 1;
    }

    const d = comparePart(p, q);

    if (d !== 0) {
      return d;
    }
  }

  return 0;
}

export function compareCfVersion(a: string, b: string): number {
  const x = splitVersion(a);
  const y = splitVersion(b);

  for (let i = 0; i < 3; i += 1) {
    const d = (x.core[i] ?? 0) - (y.core[i] ?? 0);

    if (d !== 0) {
      return Math.sign(d);
    }
  }

  return comparePre(x.pre, y.pre);
}

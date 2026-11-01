export const WORKER_NAME = "design-studio-publish";
export const SCHEMA_VERSION = 1;

export const LIMITS = {
  maxFileBytes: 25 * 1024 * 1024,
  maxVersionBytes: 100 * 1024 * 1024,
  maxFiles: 2000,
  maxPathLength: 512,
  apiPerMinute: 600,
  commentsPer10Min: 5,
  unlockPer10Min: 10,
  commentAuthorMax: 60,
  commentBodyMax: 2000,
  titleMax: 120,
  versionsListed: 20,
} as const;

export type PublishKind = "site" | "viewer";

export interface ManifestFile {
  path: string;
  sha256: string;
  size: number;
}

export interface CreatePublicationBody {
  projectId: string;
  projectName: string;
  title: string;
  kind: PublishKind;
}

export interface CreateVersionBody {
  label: string;
  sourceVersion: string;
  files: ManifestFile[];
}

export interface CreateVersionReply {
  versionId: string;
  missing: string[];
  bytes: number;
}

export interface PublicationSettings {
  title?: string;
  passwordHash?: string | null;
  expiresAt?: number | null;
  noindex?: boolean;
  comments?: boolean;
}

export interface RemoteVersion {
  id: string;
  label: string;
  sourceVersion: string;
  fileCount: number;
  bytes: number;
  createdAt: number;
  committedAt: number | null;
}

export interface RemotePublication {
  id: string;
  slug: string;
  projectId: string;
  projectName: string;
  title: string;
  kind: PublishKind;
  path: string;
  currentVersion: string | null;
  password: boolean;
  expiresAt: number | null;
  noindex: boolean;
  comments: boolean;
  revokedAt: number | null;
  createdAt: number;
  updatedAt: number;
  versions: RemoteVersion[];
  views: {
    total: number;
    last7: number;
    days: { day: string; views: number }[];
  };
  commentCount: number;
}

export interface RemoteComment {
  id: string;
  author: string;
  body: string;
  createdAt: number;
}

export interface HealthReply {
  ok: true;
  worker: string;
  schema: number;
  publications: number;
}

export interface ApiErrorBody {
  error: string;
  code: string;
}

export const SHA256_HEX = /^[0-9a-f]{64}$/;
export const PUBLICATION_ID = /^[A-Za-z0-9_-]{8,32}$/;

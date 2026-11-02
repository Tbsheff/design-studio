const WORKER_NAME = "design-studio-publish";

const SCHEMA_VERSION = 1;

const MIB = 1_048_576;

const MAX_FILE_MIB = 25;

const MAX_VERSION_MIB = 100;

const LIMITS = {
  apiPerMinute: 600,
  commentAuthorMax: 60,
  commentBodyMax: 2000,
  commentsPer10Min: 5,
  maxFileBytes: MAX_FILE_MIB * MIB,
  maxFiles: 2000,
  maxPathLength: 512,
  maxVersionBytes: MAX_VERSION_MIB * MIB,
  titleMax: 120,
  unlockPer10Min: 10,
  versionsListed: 20,
} as const;

type PublishKind = "site" | "viewer";

interface ManifestFile {
  path: string;
  sha256: string;
  size: number;
}

interface CreatePublicationBody {
  projectId: string;
  projectName: string;
  title: string;
  kind: PublishKind;
}

interface CreateVersionBody {
  label: string;
  sourceVersion: string;
  files: ManifestFile[];
}

interface CreateVersionReply {
  versionId: string;
  missing: string[];
  bytes: number;
}

interface PublicationSettings {
  title?: string;
  passwordHash?: string | null;
  expiresAt?: number | null;
  noindex?: boolean;
  comments?: boolean;
}

interface RemoteVersion {
  id: string;
  label: string;
  sourceVersion: string;
  fileCount: number;
  bytes: number;
  createdAt: number;
  committedAt: number | null;
}

interface RemotePublication {
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

interface RemoteComment {
  id: string;
  author: string;
  body: string;
  createdAt: number;
}

interface HealthReply {
  ok: true;
  worker: string;
  schema: number;
  publications: number;
}

interface ApiErrorBody {
  error: string;
  code: string;
}

const SHA256_HEX = /^[0-9a-f]{64}$/u;

const PUBLICATION_ID = /^[A-Za-z0-9_-]{8,32}$/u;

export { LIMITS, PUBLICATION_ID, SCHEMA_VERSION, SHA256_HEX, WORKER_NAME };

export type {
  ApiErrorBody,
  CreatePublicationBody,
  CreateVersionBody,
  CreateVersionReply,
  HealthReply,
  ManifestFile,
  PublicationSettings,
  PublishKind,
  RemoteComment,
  RemotePublication,
  RemoteVersion,
};

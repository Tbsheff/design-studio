import { Schema } from "effect";

import { toCloudId } from "@design-studio/actions/publish/schema";
import type {
  ShareCreated,
  ShareRevoked,
} from "@design-studio/actions/share/schema";
import type { Publication } from "../../shared/publish.js";

const CloudPublicationSchema = Schema.Struct({
  createdAt: Schema.Number,
  directionId: Schema.String,
  hasPassword: Schema.Boolean,
  hasViewerComments: Schema.Boolean,
  id: Schema.String,
  isNoindex: Schema.Boolean,
  projectId: Schema.String,
  title: Schema.String,
  updatedAt: Schema.Number,
  url: Schema.String,
  versionId: Schema.String,
});

const CloudPublicationListSchema = Schema.Struct({
  publications: Schema.Array(CloudPublicationSchema),
});

const CloudShareSchema = Schema.Struct({
  createdAt: Schema.Number,
  directionId: Schema.String,
  expiresAt: Schema.Number,
  id: Schema.String,
  projectId: Schema.String,
  title: Schema.String,
  token: Schema.String,
  url: Schema.String,
  versionId: Schema.String,
});

type CloudPublication = typeof CloudPublicationSchema.Type;

type CloudShare = typeof CloudShareSchema.Type;

const STOPPED_SERVER = {
  lan: false,
  lanUrl: null,
  localUrl: null,
  running: false,
} as const;

const toProjectPath = (orgId: string, projectId: string): string =>
  `/v1/o/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}`;

const toPublication = (row: CloudPublication): Publication => ({
  accountId: null,
  backend: "app",
  bytes: 0,
  commentCount: 0,
  commentsUrl: null,
  createdAt: row.createdAt,
  directionId: row.directionId,
  error: null,
  expiresAt: null,
  fileCount: 0,
  id: toCloudId(row.id),
  isLegacy: false,
  kind: "viewer",
  lastUpload: null,
  log: "",
  noindex: row.isNoindex,
  pages: [],
  password: row.hasPassword,
  projectId: row.projectId,
  status: "live",
  title: row.title,
  updatedAt: row.updatedAt,
  url: row.url,
  versionId: row.versionId,
  versions: [],
  viewerComments: row.hasViewerComments,
  views: null,
  workerName: null,
});

const toCreatedShare = (row: CloudShare): ShareCreated => ({
  link: {
    active: true,
    comments: 0,
    createdAt: row.createdAt,
    directionId: row.directionId,
    expiresAt: row.expiresAt,
    frames: [],
    id: toCloudId(row.id),
    live: false,
    projectId: row.projectId,
    rev: 0,
    revokedAt: null,
    studioCursor: false,
    title: row.title,
    versionId: row.versionId,
    viewers: 0,
  },
  server: STOPPED_SERVER,
  token: row.token,
  url: row.url,
});

const toRevokedShare = (): ShareRevoked => ({
  link: null,
  server: STOPPED_SERVER,
});

export {
  CloudPublicationListSchema,
  CloudPublicationSchema,
  CloudShareSchema,
  toCreatedShare,
  toProjectPath,
  toPublication,
  toRevokedShare,
};

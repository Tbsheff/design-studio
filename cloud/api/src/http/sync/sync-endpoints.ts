import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";

import { NotFoundWire } from "../groups/wire-errors.js";
import { SYNC_ERRORS } from "./sync-errors.js";
import { SyncGate } from "./sync-gate.js";
import {
  BlobParams,
  BlobPayload,
  CloudRefHeaders,
  CommitPayload,
  CommitSuccess,
  CreateHeaders,
  ManifestPayload,
  MissingPayload,
  MissingSuccess,
  OkSuccess,
  ProjectParams,
  PullQuery,
  PullSuccess,
  PushPayload,
  PushSuccess,
  PutProjectPayload,
  PutProjectSuccess,
} from "./sync-schemas.js";

const SYNC_PATH = "/v1/o/:orgId/projects/:projectId/sync";

const errors = [...SYNC_ERRORS, NotFoundWire];

const putProject = HttpApiEndpoint.put("putProject", `${SYNC_PATH}/project`, {
  error: errors,
  headers: CreateHeaders,
  params: ProjectParams,
  payload: PutProjectPayload,
  success: PutProjectSuccess,
});

const push = HttpApiEndpoint.post("push", `${SYNC_PATH}/push`, {
  error: errors,
  headers: CloudRefHeaders,
  params: ProjectParams,
  payload: PushPayload,
  success: PushSuccess,
});

const pull = HttpApiEndpoint.get("pull", `${SYNC_PATH}/pull`, {
  error: errors,
  headers: CloudRefHeaders,
  params: ProjectParams,
  query: PullQuery,
  success: PullSuccess,
});

const manifest = HttpApiEndpoint.post("manifest", `${SYNC_PATH}/manifest`, {
  error: errors,
  headers: CloudRefHeaders,
  params: ProjectParams,
  payload: ManifestPayload,
  success: MissingSuccess,
});

const missing = HttpApiEndpoint.post("missing", `${SYNC_PATH}/missing`, {
  error: errors,
  headers: CloudRefHeaders,
  params: ProjectParams,
  payload: MissingPayload,
  success: MissingSuccess,
});

const blob = HttpApiEndpoint.put("blob", `${SYNC_PATH}/blob/:blobId`, {
  error: errors,
  headers: CloudRefHeaders,
  params: BlobParams,
  payload: BlobPayload,
  success: OkSuccess,
});

const commit = HttpApiEndpoint.post("commit", `${SYNC_PATH}/commit`, {
  error: errors,
  headers: CloudRefHeaders,
  params: ProjectParams,
  payload: CommitPayload,
  success: CommitSuccess,
});

const SyncGroup = HttpApiGroup.make("sync")
  .add(putProject, push, pull, manifest, missing, blob, commit)
  .middleware(SyncGate);

export { SYNC_PATH, SyncGroup };

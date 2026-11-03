import { Schema } from "effect";

const ProjectParams = { orgId: Schema.String, projectId: Schema.String };

const BlobParams = { ...ProjectParams, blobId: Schema.String };

const CloudRefHeaders = { "x-cloud-ref": Schema.String };

const CreateHeaders = { "if-none-match": Schema.String };

const ManifestFileSchema = Schema.Struct({
  blobId: Schema.String,
  mode: Schema.Int,
  path: Schema.String,
  size: Schema.Int,
});

const ChangeSchema = Schema.Struct({
  id: Schema.String,
  op: Schema.Literals(["insert", "update", "delete"]),
  rowId: Schema.String,
  rowRev: Schema.Int,
  tableName: Schema.String,
});

const ChangeWireSchema = Schema.Struct({
  created_at: Schema.Number,
  id: Schema.String,
  op: Schema.String,
  row_id: Schema.String,
  row_rev: Schema.Number,
  seq: Schema.Number,
  table_name: Schema.String,
});

const PutProjectPayload = Schema.Struct({
  kind: Schema.String,
  name: Schema.String,
});

const PushPayload = Schema.Struct({
  changes: Schema.Array(ChangeSchema),
  rev: Schema.Int,
});

const ManifestPayload = Schema.Struct({
  directionId: Schema.String,
  files: Schema.Array(ManifestFileSchema),
});

const MissingPayload = Schema.Struct({ blobIds: Schema.Array(Schema.String) });

const BlobPayload = Schema.Struct({ data: Schema.String });

const CommitPayload = Schema.Struct({
  directionId: Schema.String,
  expectedRev: Schema.Int,
  files: Schema.Array(ManifestFileSchema),
  message: Schema.NullOr(Schema.String),
});

const PullQuery = {
  after: Schema.optionalKey(Schema.Int),
  limit: Schema.optionalKey(Schema.Int),
};

const PutProjectSuccess = Schema.Struct({
  rev: Schema.Number,
  sig: Schema.String,
});

const PushSuccess = Schema.Struct({ rev: Schema.Number });

const PullSuccess = Schema.Struct({
  cursor: Schema.NullOr(Schema.Number),
  items: Schema.Array(ChangeWireSchema),
});

const MissingSuccess = Schema.Struct({ missing: Schema.Array(Schema.String) });

const OkSuccess = Schema.Struct({ ok: Schema.Boolean });

const CommitSuccess = Schema.Struct({
  rev: Schema.Number,
  versionId: Schema.String,
});

export {
  BlobParams,
  BlobPayload,
  ChangeSchema,
  CloudRefHeaders,
  CommitPayload,
  CommitSuccess,
  CreateHeaders,
  ManifestFileSchema,
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
};

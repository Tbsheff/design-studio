import { Effect, Option, Schema } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { Unavailable } from "../../shared/actions/_core/errors/unavailable.js";
import type { PublishInput } from "../../shared/actions/publish/schema.js";
import type { ShareCreated } from "../../shared/actions/share/schema.js";
import type { Publication } from "../../shared/publish.js";
import { CloudSession } from "../cloud/index.js";
import { DeviceBindings } from "../store/index.js";

const CLOUD_ORIGIN = "https://api.designstudio.app";

const CLOUD_PREFIX = "cloud_";

const HOUR_MS = 3_600_000;

const DEFAULT_SHARE_HOURS = 72;

const CloudPublicationSchema = Schema.Struct({
  createdAt: Schema.Number,
  id: Schema.String,
  title: Schema.String,
  updatedAt: Schema.Number,
  url: Schema.String,
});

const CloudPublicationListSchema = Schema.Struct({
  publications: Schema.Array(CloudPublicationSchema),
});

const CloudShareSchema = Schema.Struct({
  createdAt: Schema.Number,
  expiresAt: Schema.Number,
  id: Schema.String,
  title: Schema.String,
  url: Schema.String,
});

type CloudPublication = typeof CloudPublicationSchema.Type;

type CloudShare = typeof CloudShareSchema.Type;

type CloudFailure = BadRequest;

type CloudBody = Readonly<Record<string, boolean | number | string | null>>;

interface CloudCall {
  readonly body: CloudBody | null;
  readonly method: "DELETE" | "GET" | "POST";
  readonly path: string;
}

const toUnavailable = (): Unavailable =>
  new Unavailable({ message: "The cloud did not answer." });

const toBadRequest = (cause: { readonly message: string }): BadRequest =>
  new BadRequest({ message: `Cloud link failed. ${cause.message}` });

const toCloudId = (id: string): string => `${CLOUD_PREFIX}${id}`;

const isCloudId = (id: string): boolean => id.startsWith(CLOUD_PREFIX);

const fromCloudId = (id: string): string => id.slice(CLOUD_PREFIX.length);

const toBody = (body: CloudBody | null): string | null => {
  if (body === null) {
    return null;
  }

  return JSON.stringify(body);
};

const sendCall = <Value>(
  jwt: string,
  call: CloudCall,
  schema: Schema.Codec<Value, unknown>
): Effect.Effect<Value, Unavailable> =>
  Effect.gen(function* send() {
    const response = yield* Effect.tryPromise({
      catch: toUnavailable,
      try: (signal) =>
        fetch(new URL(call.path, CLOUD_ORIGIN), {
          body: toBody(call.body),
          headers: {
            authorization: `Bearer ${jwt}`,
            "content-type": "application/json",
          },
          method: call.method,
          redirect: "error",
          signal,
        }),
    });

    if (!response.ok) {
      return yield* toUnavailable();
    }

    const body = yield* Effect.tryPromise({
      catch: toUnavailable,
      try: () => response.json(),
    });

    return yield* Schema.decodeUnknownEffect(schema)(body).pipe(
      Effect.mapError(toUnavailable)
    );
  });

const callCloud = <Value>(
  call: CloudCall,
  schema: Schema.Codec<Value, unknown>
): Effect.Effect<Value, CloudFailure> =>
  Effect.gen(function* run() {
    const session = yield* Effect.serviceOption(CloudSession);

    if (Option.isNone(session)) {
      return yield* toBadRequest(toUnavailable());
    }

    return yield* session.value
      .withToken((jwt) => sendCall(jwt, call, schema))
      .pipe(Effect.mapError(toBadRequest));
  });

const findCloudOrg = Effect.fn("cloudLinks.findCloudOrg")(function* run(
  projectId: string
) {
  const bindings = yield* Effect.serviceOption(DeviceBindings);

  if (Option.isNone(bindings)) {
    return null;
  }

  return yield* bindings.value.getOrgOfProject(projectId);
});

const toProjectPath = (orgId: string, projectId: string): string =>
  `/v1/o/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}`;

const toPublication = (
  input: PublishInput,
  row: CloudPublication
): Publication => ({
  accountId: null,
  backend: "app",
  bytes: 0,
  commentCount: 0,
  commentsUrl: null,
  createdAt: row.createdAt,
  directionId: input.directionId ?? "",
  error: null,
  expiresAt: null,
  fileCount: 0,
  id: toCloudId(row.id),
  isLegacy: false,
  kind: "viewer",
  lastUpload: null,
  log: "",
  noindex: input.noindex ?? true,
  pages: [],
  password: "password" in input,
  projectId: input.projectId,
  status: "live",
  title: row.title,
  updatedAt: row.updatedAt,
  url: row.url,
  versionId: input.versionId ?? "",
  versions: [],
  viewerComments: input.viewerComments ?? false,
  views: null,
  workerName: null,
});

const toListedPublication = (
  projectId: string,
  row: CloudPublication
): Publication => ({
  ...toPublication({ projectId }, row),
  password: false,
});

const publishToCloud = Effect.fn("cloudLinks.publishToCloud")(function* run(
  orgId: string,
  input: PublishInput
) {
  const row = yield* callCloud(
    {
      body: {
        directionId: input.directionId ?? null,
        hasPassword: "password" in input,
        noindex: input.noindex ?? true,
        title: input.title ?? null,
        versionId: input.versionId ?? null,
        viewerComments: input.viewerComments ?? false,
      },
      method: "POST",
      path: `${toProjectPath(orgId, input.projectId)}/publications`,
    },
    CloudPublicationSchema
  );

  return toPublication(input, row);
});

const listCloudPublications = Effect.fn("cloudLinks.listCloudPublications")(
  function* run(orgId: string, projectId: string) {
    const list = yield* callCloud(
      {
        body: null,
        method: "GET",
        path: `${toProjectPath(orgId, projectId)}/publications`,
      },
      CloudPublicationListSchema
    ).pipe(Effect.orElseSucceed(() => ({ publications: [] })));

    return list.publications.map((row) => toListedPublication(projectId, row));
  }
);

const unpublishFromCloud = Effect.fn("cloudLinks.unpublishFromCloud")(
  function* run(orgId: string, projectId: string, publicationId: string) {
    const row = yield* callCloud(
      {
        body: null,
        method: "DELETE",
        path: `${toProjectPath(orgId, projectId)}/publications/${encodeURIComponent(fromCloudId(publicationId))}`,
      },
      CloudPublicationSchema
    );

    return {
      ...toListedPublication(projectId, row),
      status: "removed" as const,
    };
  }
);

interface ShareCloudInput {
  readonly directionId?: string | null;
  readonly expiresInHours?: number;
  readonly projectId: string;
  readonly title?: string;
  readonly versionId?: string;
}

const toCreatedShare = (
  input: ShareCloudInput,
  row: CloudShare
): ShareCreated => ({
  link: {
    active: true,
    comments: 0,
    createdAt: row.createdAt,
    directionId: input.directionId ?? "",
    expiresAt: row.expiresAt,
    frames: [],
    id: toCloudId(row.id),
    live: false,
    projectId: input.projectId,
    rev: 0,
    revokedAt: null,
    studioCursor: false,
    title: row.title,
    versionId: input.versionId ?? "",
    viewers: 0,
  },
  server: { lan: false, lanUrl: null, localUrl: null, running: false },
  token: "",
  url: row.url,
});

const createCloudShare = Effect.fn("cloudLinks.createCloudShare")(function* run(
  orgId: string,
  input: ShareCloudInput
) {
  const hours = input.expiresInHours ?? DEFAULT_SHARE_HOURS;

  const row = yield* callCloud(
    {
      body: {
        directionId: input.directionId ?? null,
        expiresAt: Date.now() + hours * HOUR_MS,
        title: input.title ?? null,
        versionId: input.versionId ?? null,
      },
      method: "POST",
      path: `${toProjectPath(orgId, input.projectId)}/shares`,
    },
    CloudShareSchema
  );

  return toCreatedShare(input, row);
});

const revokeCloudShare = Effect.fn("cloudLinks.revokeCloudShare")(function* run(
  orgId: string,
  projectId: string,
  shareId: string
) {
  yield* callCloud(
    {
      body: null,
      method: "DELETE",
      path: `${toProjectPath(orgId, projectId)}/shares/${encodeURIComponent(fromCloudId(shareId))}`,
    },
    CloudShareSchema
  );

  return {
    link: null,
    server: { lan: false, lanUrl: null, localUrl: null, running: false },
  };
});

export {
  createCloudShare,
  findCloudOrg,
  isCloudId,
  listCloudPublications,
  publishToCloud,
  revokeCloudShare,
  unpublishFromCloud,
};

export type { CloudFailure, ShareCloudInput };

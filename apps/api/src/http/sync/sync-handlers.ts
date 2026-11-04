import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { Effect } from "effect";
import type { HttpApiBuilder } from "effect/http-api";

import { TenantBlobs } from "../../tenant/blobs.js";
import { ChangesRepo } from "../../tenant/repos/changes.js";
import { ProjectsRepo } from "../../tenant/repos/projects.js";
import { VersionsRepo } from "../../tenant/repos/versions.js";
import { requireOrg, requirePerm } from "../groups/authorizer.js";
import { CurrentUser } from "../middleware/current-user.js";
import {
  requireCloudRef,
  requireDetached,
  requireSafeManifest,
} from "./sync-checks.js";
import type { SyncGroup } from "./sync-endpoints.js";
import { SyncSigner } from "./sync-signer.js";

const HEX_RADIX = 16;

const STALE_PROJECT = "The project rev is out of date.";

const STALE_HEAD = "The head rev is out of date.";

const PULL_DEFAULT = 100;

const CREATE_ANY = "*";

const toBytes = (data: string): Uint8Array =>
  Uint8Array.from(atob(data), (char) => char.codePointAt(0) ?? 0);

const BLOB_CHECKS = 8;

const toHex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(HEX_RADIX).padStart(2, "0"))
    .join("");

const findMissing = Effect.fn("Sync.findMissing")(function* run(
  blobIds: readonly string[]
) {
  const blobs = yield* TenantBlobs;

  const found = yield* Effect.all(
    blobIds.map((name) =>
      blobs.get({ kind: "blob", name }).pipe(
        Effect.as(true),
        Effect.orElseSucceed(() => false)
      )
    ),
    { concurrency: BLOB_CHECKS }
  );

  return { missing: blobIds.filter((_name, index) => found[index] !== true) };
});

const putProject = Effect.fn("Sync.putProject")(function* run(input: {
  readonly ifNoneMatch: string;
  readonly kind: string;
  readonly name: string;
  readonly orgId: string;
  readonly projectId: string;
}) {
  yield* requireOrg(input.orgId);
  yield* requirePerm("project.create");

  if (input.ifNoneMatch !== CREATE_ANY) {
    return yield* new BadRequest({ message: "Send If-None-Match: *." });
  }

  const projects = yield* ProjectsRepo;

  const existing = yield* projects
    .get(input.projectId)
    .pipe(Effect.orElseSucceed(() => null));

  if (existing !== null) {
    return yield* new Conflict({ message: "The project already exists." });
  }

  yield* projects.create({
    createdBy: null,
    id: input.projectId,
    kind: input.kind,
    name: input.name,
  });

  const signer = yield* SyncSigner;
  const sig = yield* signer.sign(input.orgId, input.projectId);

  return { rev: 0, sig };
});

const push = Effect.fn("Sync.push")(function* run(input: {
  readonly changes: readonly {
    readonly id: string;
    readonly op: "delete" | "insert" | "update";
    readonly rowId: string;
    readonly rowRev: number;
    readonly tableName: string;
  }[];
  readonly orgId: string;
  readonly projectId: string;
  readonly rev: number;
  readonly sig: string;
}) {
  yield* requireCloudRef(input.orgId, input.projectId, input.sig);
  yield* requirePerm("project.update");
  const projects = yield* ProjectsRepo;
  const changes = yield* ChangesRepo;
  const project = yield* projects.get(input.projectId);

  if (project.rev !== input.rev) {
    return yield* new Conflict({ message: STALE_PROJECT });
  }

  yield* projects
    .rename({ id: project.id, name: project.name, rev: input.rev })
    .pipe(Effect.mapError(() => new Conflict({ message: STALE_PROJECT })));

  const user = yield* CurrentUser;

  yield* changes.appendAll(
    input.changes.map((change) => ({
      ...change,
      actorId: user.userId,
      deviceId: null,
    }))
  );

  return { rev: input.rev + 1 };
});

const pull = Effect.fn("Sync.pull")(function* run(input: {
  readonly after: number;
  readonly limit: number;
  readonly orgId: string;
  readonly projectId: string;
  readonly sig: string;
}) {
  yield* requireCloudRef(input.orgId, input.projectId, input.sig);
  yield* requirePerm("project.read");
  const changes = yield* ChangesRepo;
  const page = yield* changes.list(input.after, input.limit);

  return { cursor: page.cursor, items: page.items };
});

const manifest = Effect.fn("Sync.manifest")(function* run(input: {
  readonly files: readonly {
    readonly blobId: string;
    readonly mode: number;
    readonly path: string;
  }[];
  readonly orgId: string;
  readonly projectId: string;
  readonly sig: string;
}) {
  yield* requireCloudRef(input.orgId, input.projectId, input.sig);
  yield* requirePerm("project.read");
  yield* requireDetached(input.projectId);
  yield* requireSafeManifest(input.files);

  return yield* findMissing(input.files.map((file) => file.blobId));
});

const missing = Effect.fn("Sync.missing")(function* run(input: {
  readonly blobIds: readonly string[];
  readonly orgId: string;
  readonly projectId: string;
  readonly sig: string;
}) {
  yield* requireCloudRef(input.orgId, input.projectId, input.sig);
  yield* requirePerm("project.read");
  yield* requireDetached(input.projectId);

  return yield* findMissing(input.blobIds);
});

const putBlob = Effect.fn("Sync.putBlob")(function* run(input: {
  readonly blobId: string;
  readonly data: string;
  readonly orgId: string;
  readonly projectId: string;
  readonly sig: string;
}) {
  yield* requireCloudRef(input.orgId, input.projectId, input.sig);
  yield* requirePerm("project.update");
  yield* requireDetached(input.projectId);
  const bytes = toBytes(input.data);

  const digest = yield* Effect.promise(() =>
    crypto.subtle.digest("SHA-256", bytes)
  );

  if (toHex(digest) !== input.blobId) {
    return yield* new BadRequest({ message: "The blob hash does not match." });
  }

  const blobs = yield* TenantBlobs;
  yield* blobs.put(
    { kind: "blob", name: input.blobId },
    bytes.buffer as ArrayBuffer
  );

  return { ok: true };
});

const commit = Effect.fn("Sync.commit")(function* run(input: {
  readonly directionId: string;
  readonly expectedRev: number;
  readonly files: readonly {
    readonly blobId: string;
    readonly mode: number;
    readonly path: string;
    readonly size: number;
  }[];
  readonly message: string | null;
  readonly orgId: string;
  readonly projectId: string;
  readonly sig: string;
}) {
  yield* requireCloudRef(input.orgId, input.projectId, input.sig);
  yield* requirePerm("project.update");
  yield* requireDetached(input.projectId);
  yield* requireSafeManifest(input.files);
  const lost = yield* findMissing(input.files.map((file) => file.blobId));

  if (lost.missing.length > 0) {
    return yield* new BadRequest({ message: "Some blobs are not uploaded." });
  }

  const versions = yield* VersionsRepo;
  const head = yield* versions.getHead(input.directionId);

  if (head.rev !== input.expectedRev) {
    return yield* new Conflict({ message: STALE_HEAD });
  }

  const versionId = crypto.randomUUID();

  yield* versions.createVersion({
    authorId: null,
    directionId: input.directionId,
    id: versionId,
    message: input.message,
    parentVersionId: head.head_version_id,
  });

  yield* versions.storeFiles(
    input.files.map((file) => ({
      blob: { id: file.blobId, size: file.size },
      file: {
        blobId: file.blobId,
        id: crypto.randomUUID(),
        mode: file.mode,
        path: file.path,
        versionId,
      },
    }))
  );

  yield* versions
    .advanceHead({
      directionId: input.directionId,
      expectedRev: input.expectedRev,
      versionId,
    })
    .pipe(Effect.mapError(() => new Conflict({ message: STALE_HEAD })));

  return { rev: input.expectedRev + 1, versionId };
});

const syncHandlers = (
  handlers: HttpApiBuilder.Handlers.FromGroup<typeof SyncGroup>
) =>
  Effect.succeed(
    handlers
      .handle("putProject", ({ headers, params, payload }) =>
        putProject({
          ifNoneMatch: headers["if-none-match"],
          ...params,
          ...payload,
        })
      )
      .handle("push", ({ headers, params, payload }) =>
        push({ ...params, ...payload, sig: headers["x-cloud-ref"] })
      )
      .handle("pull", ({ headers, params, query }) =>
        pull({
          ...params,
          after: query.after ?? 0,
          limit: query.limit ?? PULL_DEFAULT,
          sig: headers["x-cloud-ref"],
        })
      )
      .handle("manifest", ({ headers, params, payload }) =>
        manifest({ ...params, ...payload, sig: headers["x-cloud-ref"] })
      )
      .handle("missing", ({ headers, params, payload }) =>
        missing({ ...params, ...payload, sig: headers["x-cloud-ref"] })
      )
      .handle("blob", ({ headers, params, payload }) =>
        putBlob({ ...params, ...payload, sig: headers["x-cloud-ref"] })
      )
      .handle("commit", ({ headers, params, payload }) =>
        commit({ ...params, ...payload, sig: headers["x-cloud-ref"] })
      )
  );

export { commit, manifest, pull, push, putProject, syncHandlers };

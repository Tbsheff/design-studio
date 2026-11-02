import { Context, Effect, Layer } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { CfFailed } from "../../shared/actions/publish/errors/cf-failed.js";
import type { Publication } from "../../shared/publish.js";
import { loadConfig } from "../platform/config/index.js";
import { NotFoundError } from "../store/errors.js";
import { CfCli } from "./cf-cli.js";
import type { CfCliApi } from "./cf-cli.js";
import { cliEnv, cliFailure, DEFAULT_TIMEOUT_MS } from "./cli.js";
import { toPublishCore } from "./publish-core.js";
import type { PublishCore } from "./publish-core.js";
import { remoteClient, studioErrors } from "./remote.js";
import { scrubCliText, tailLines } from "./scrub.js";
import { mergeRemote } from "./service.js";
import type { ReadyCli } from "./session.js";
import { toPublication } from "./store.js";
import type { PublicationRecord } from "./store.js";

type WriteError = BadRequest | CfFailed | NotFound;

interface PublishServiceApi {
  readonly deleteComment: (
    projectId: string,
    publicationId: string,
    commentId: string
  ) => Effect.Effect<void, WriteError>;
  readonly rollback: (
    projectId: string,
    publicationId: string,
    versionId: string
  ) => Effect.Effect<Publication, WriteError>;
  readonly unpublish: (
    projectId: string,
    publicationId: string
  ) => Effect.Effect<Publication, WriteError>;
}

const MISSING_WORKER = /not found|does not exist|10007/iu;

const openCore = (): PublishCore => toPublishCore(loadConfig().dataDir);

const LOG_LINES = 20;

const toWriteError = (error: Cause.UnknownError): BadRequest | NotFound => {
  if (error.cause instanceof NotFoundError) {
    return new NotFound({ message: error.cause.message });
  }

  if (error.cause instanceof Error) {
    return new BadRequest({ message: error.cause.message });
  }

  return new BadRequest({ message: String(error.cause) });
};

const attempt = <Value>(
  task: () => Promise<Value>
): Effect.Effect<Value, BadRequest | NotFound> =>
  Effect.tryPromise(task).pipe(
    Effect.mapError((failure) => toWriteError(failure))
  );

const remote = <Value>(
  task: () => Promise<Value>
): Effect.Effect<Value, BadRequest | NotFound> =>
  attempt(() => studioErrors(task));

const locked = <Value>(
  core: PublishCore,
  key: string,
  task: () => Promise<Value>
): Effect.Effect<Value, BadRequest | NotFound> =>
  attempt(() => core.lock(key, () => studioErrors(task)));

const readyCli = (
  core: PublishCore,
  accountId: string | null
): Promise<ReadyCli> => {
  if (accountId === null) {
    return core.cli.ready();
  }

  return core.cli.ready(accountId);
};

const readOwned = (
  core: PublishCore,
  projectId: string,
  publicationId: string
): Effect.Effect<PublicationRecord, NotFound> =>
  Effect.gen(function* owned() {
    const found = yield* Effect.promise(() => core.files.get(publicationId));

    if (!found || found.projectId !== projectId) {
      return yield* new NotFound({ message: "publication not found" });
    }

    return found;
  });

const removeLegacy = (
  cf: CfCliApi,
  core: PublishCore,
  found: PublicationRecord
): Effect.Effect<PublicationRecord, WriteError> =>
  Effect.gen(function* removeWorker() {
    const ready = yield* attempt(() => readyCli(core, found.accountId ?? null));

    const out = yield* cf.run({
      args: ["workers", "delete", String(found.workerName), "--force"],
      bin: ready.bin,
      options: {
        cwd: core.files.dir,
        env: cliEnv(found.accountId),
        timeoutMs: DEFAULT_TIMEOUT_MS,
      },
    });

    const text = scrubCliText(`${out.stderr}\n${out.stdout}`, [
      ...core.secrets,
    ]);

    if (out.code !== 0 && !MISSING_WORKER.test(text)) {
      return yield* new BadRequest({
        message: cliFailure(out, "Unpublish failed."),
      });
    }

    const removed: PublicationRecord = {
      ...found,
      error: null,
      log: tailLines(text, LOG_LINES),
      status: "removed",
      updatedAt: Date.now(),
    };

    return yield* Effect.promise(() => core.files.put(removed));
  });

const removeApp = (
  core: PublishCore,
  found: PublicationRecord
): Effect.Effect<PublicationRecord, BadRequest | NotFound> =>
  locked(core, found.id, async () => {
    const endpoint = await core.backend.endpoint();
    const out = await remoteClient(endpoint).revoke(found.id);

    return core.files.put({
      ...mergeRemote(found, out.publication, endpoint.url),
      hashes: [],
      status: "removed",
      updatedAt: Date.now(),
    });
  });

const makeApi = (cf: CfCliApi): PublishServiceApi => ({
  deleteComment: Effect.fn("PublishService.deleteComment")(function* run(
    projectId: string,
    publicationId: string,
    commentId: string
  ) {
    const core = openCore();
    const found = yield* readOwned(core, projectId, publicationId);

    yield* remote(async () =>
      remoteClient(await core.backend.endpoint()).deleteComment(
        found.id,
        commentId
      )
    );
  }),
  rollback: Effect.fn("PublishService.rollback")(function* run(
    projectId: string,
    publicationId: string,
    versionId: string
  ) {
    const core = openCore();
    const found = yield* readOwned(core, projectId, publicationId);

    if (found.backend !== "app") {
      return yield* new BadRequest({
        message: "Old per-design Workers have no versions to roll back to.",
      });
    }

    const saved = yield* locked(core, found.id, async () => {
      const endpoint = await core.backend.endpoint();
      const next = await remoteClient(endpoint).rollback(found.id, versionId);

      return core.files.put({
        ...mergeRemote(found, next, endpoint.url),
        updatedAt: Date.now(),
      });
    });

    return toPublication(saved);
  }),
  unpublish: Effect.fn("PublishService.unpublish")(function* run(
    projectId: string,
    publicationId: string
  ) {
    const core = openCore();
    const found = yield* readOwned(core, projectId, publicationId);

    if (found.status === "removed") {
      return toPublication(found);
    }

    if (found.backend !== "app") {
      return toPublication(yield* removeLegacy(cf, core, found));
    }

    return toPublication(yield* removeApp(core, found));
  }),
});

class PublishService extends Context.Service<
  PublishService,
  PublishServiceApi
>()("design-studio/publish/PublishService") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    PublishService,
    Effect.gen(function* build() {
      const cf = yield* CfCli;

      return PublishService.of(makeApi(cf));
    })
  );
}

export { PublishService };

export type { PublishServiceApi };

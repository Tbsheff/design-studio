import { Context, Effect, Layer } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { CfFailed } from "../../shared/actions/publish/errors/cf-failed.js";
import type {
  PublishBackendMode,
  PublishBackendState,
  PublishCliState,
  PublishInput,
} from "../../shared/actions/publish/schema.js";
import type { Publication } from "../../shared/publish.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import { CfCli } from "./cf-cli.js";
import type { CfCliApi } from "./cf-cli.js";
import { cliEnv, cliFailure, DEFAULT_TIMEOUT_MS } from "./cli.js";
import { attemptLegacy } from "./legacy-link.js";
import { toPublishCore } from "./publish-core.js";
import type { PublishCore } from "./publish-core.js";
import {
  deleteRemoteComment,
  publishLegacy,
  revokeRemote,
  rollbackRemote,
} from "./publish-remote-writes.js";
import { studioErrors } from "./remote.js";
import { scrubCliText, tailLines } from "./scrub.js";
import type { ReadyCli } from "./session.js";
import { toPublication } from "./store.js";
import type { PublicationRecord } from "./store.js";

type WriteError = CfFailed | KnownFailure;

type SetupError = KnownFailure;

interface PublishServiceApi {
  readonly applyBackend: (
    mode: PublishBackendMode
  ) => Effect.Effect<PublishBackendState, SetupError>;
  readonly cancelLogin: () => Effect.Effect<PublishCliState, SetupError>;
  readonly deleteComment: (
    projectId: string,
    publicationId: string,
    commentId: string
  ) => Effect.Effect<void, WriteError>;
  readonly logout: () => Effect.Effect<PublishCliState, SetupError>;
  readonly publish: (
    input: PublishInput
  ) => Effect.Effect<Publication, KnownFailure>;
  readonly rollback: (
    projectId: string,
    publicationId: string,
    versionId: string
  ) => Effect.Effect<Publication, WriteError>;
  readonly setAccount: (
    accountId: string | null
  ) => Effect.Effect<PublishCliState, SetupError>;
  readonly startLogin: (
    isKeyring: boolean,
    isNarrow: boolean
  ) => Effect.Effect<PublishCliState, SetupError>;
  readonly unpublish: (
    projectId: string,
    publicationId: string
  ) => Effect.Effect<Publication, WriteError>;
  readonly unpublishLocal: (
    projectId: string,
    publicationId: string
  ) => Effect.Effect<Publication, NotFound>;
}

const MISSING_WORKER = /not found|does not exist|10007/iu;

const toCore = (): PublishCore => toPublishCore(loadConfig().dataDir);

const LOG_LINES = 20;

const runKnown = <Value>(
  task: () => Promise<Value>
): Effect.Effect<Value, KnownFailure> => attemptKnown(task);

const runRemote = <Value>(
  task: () => Promise<Value>
): Effect.Effect<Value, KnownFailure> => runKnown(() => studioErrors(task));

const runLocked = <Value>(
  core: PublishCore,
  key: string,
  task: () => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  runKnown(() => core.lock(key, () => studioErrors(task)));

const getReadyCli = (
  core: PublishCore,
  accountId: string | null
): Promise<ReadyCli> => {
  if (accountId === null) {
    return core.cli.ready();
  }

  return core.cli.ready(accountId);
};

const getOwned = (
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

const deleteLegacy = (
  cf: CfCliApi,
  core: PublishCore,
  found: PublicationRecord
): Effect.Effect<PublicationRecord, WriteError> =>
  Effect.gen(function* removeWorker() {
    const ready = yield* runKnown(() =>
      getReadyCli(core, found.accountId ?? null)
    );

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

const deleteApp = (
  core: PublishCore,
  found: PublicationRecord
): Effect.Effect<PublicationRecord, KnownFailure> =>
  runLocked(core, found.id, () => revokeRemote(core, found));

const setupApi = {
  applyBackend: Effect.fn("PublishService.applyBackend")(function* run(
    mode: PublishBackendMode
  ) {
    const core = toCore();

    return yield* runKnown(() => core.backend.start(mode));
  }),
  cancelLogin: Effect.fn("PublishService.cancelLogin")(function* run() {
    const core = toCore();

    return yield* runKnown(() => core.cli.cancelLogin());
  }),
  logout: Effect.fn("PublishService.logout")(function* run() {
    const core = toCore();

    return yield* runKnown(() => core.cli.logout());
  }),
  setAccount: Effect.fn("PublishService.setAccount")(function* run(
    accountId: string | null
  ) {
    const core = toCore();

    return yield* runKnown(() => core.cli.setAccount(accountId));
  }),
  startLogin: Effect.fn("PublishService.startLogin")(function* run(
    isKeyring: boolean,
    isNarrow: boolean
  ) {
    const core = toCore();

    return yield* runKnown(() => core.cli.startLogin(isKeyring, isNarrow));
  }),
};

const toServiceApi = (cf: CfCliApi): PublishServiceApi => ({
  ...setupApi,
  deleteComment: Effect.fn("PublishService.deleteComment")(function* run(
    projectId: string,
    publicationId: string,
    commentId: string
  ) {
    const core = toCore();
    const found = yield* getOwned(core, projectId, publicationId);

    yield* runRemote(() => deleteRemoteComment(core, found.id, commentId));
  }),
  publish: Effect.fn("PublishService.publish")(function* run(
    input: PublishInput
  ) {
    return yield* attemptLegacy((link) => publishLegacy(link, input));
  }),
  rollback: Effect.fn("PublishService.rollback")(function* run(
    projectId: string,
    publicationId: string,
    versionId: string
  ) {
    const core = toCore();
    const found = yield* getOwned(core, projectId, publicationId);

    if (found.backend !== "app") {
      return yield* new BadRequest({
        message: "Old per-design Workers have no versions to roll back to.",
      });
    }

    const saved = yield* runLocked(core, found.id, () =>
      rollbackRemote(core, found, versionId)
    );

    return toPublication(saved);
  }),
  unpublish: Effect.fn("PublishService.unpublish")(function* run(
    projectId: string,
    publicationId: string
  ) {
    const core = toCore();
    const found = yield* getOwned(core, projectId, publicationId);

    if (found.status === "removed") {
      return toPublication(found);
    }

    if (found.backend !== "app") {
      return toPublication(yield* deleteLegacy(cf, core, found));
    }

    return toPublication(yield* deleteApp(core, found));
  }),
  unpublishLocal: Effect.fn("PublishService.unpublishLocal")(function* run(
    projectId: string,
    publicationId: string
  ) {
    const core = toCore();
    const found = yield* getOwned(core, projectId, publicationId);

    if (found.status === "removed") {
      return { ...toPublication(found), isLegacy: true };
    }

    const removed: PublicationRecord = {
      ...found,
      status: "removed",
      updatedAt: Date.now(),
    };

    const saved = yield* Effect.promise(() => core.files.put(removed));

    return { ...toPublication(saved), isLegacy: true };
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

      return PublishService.of(toServiceApi(cf));
    })
  );
}

export { PublishService };

export type { PublishServiceApi };

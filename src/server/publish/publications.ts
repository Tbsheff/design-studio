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
import { attemptLegacy, planFor, takePlan } from "./legacy-link.js";
import type { LegacyLink } from "./legacy-link.js";
import { toPlanInput } from "./plan-input.js";
import { toPublishCore } from "./publish-core.js";
import type { PublishCore } from "./publish-core.js";
import { remoteClient, studioErrors } from "./remote.js";
import { scrubCliText, tailLines } from "./scrub.js";
import { mergeRemote } from "./service.js";
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
}

const MISSING_WORKER = /not found|does not exist|10007/iu;

const openCore = (): PublishCore => toPublishCore(loadConfig().dataDir);

const LOG_LINES = 20;

const attempt = <Value>(
  task: () => Promise<Value>
): Effect.Effect<Value, KnownFailure> => attemptKnown(task);

const remote = <Value>(
  task: () => Promise<Value>
): Effect.Effect<Value, KnownFailure> => attempt(() => studioErrors(task));

const locked = <Value>(
  core: PublishCore,
  key: string,
  task: () => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
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
): Effect.Effect<PublicationRecord, KnownFailure> =>
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

const deleteRemoteComment = async (
  core: PublishCore,
  publicationId: string,
  commentId: string
): Promise<{ deleted: string }> =>
  remoteClient(await core.backend.endpoint()).deleteComment(
    publicationId,
    commentId
  );

const publishLegacy = async (
  link: LegacyLink,
  input: PublishInput
): Promise<Publication> => {
  const planInput = await toPlanInput(link, input);
  const held = await planFor(link, input.projectId, planInput);

  takePlan(link, input.projectId, planInput);

  return link.service.publish(input.projectId, held.id);
};

const rollbackRemote = async (
  core: PublishCore,
  found: PublicationRecord,
  versionId: string
): Promise<PublicationRecord> => {
  const endpoint = await core.backend.endpoint();
  const next = await remoteClient(endpoint).rollback(found.id, versionId);

  return core.files.put({
    ...mergeRemote(found, next, endpoint.url),
    updatedAt: Date.now(),
  });
};

const setupApi = {
  applyBackend: Effect.fn("PublishService.applyBackend")(function* run(
    mode: PublishBackendMode
  ) {
    const core = openCore();

    return yield* attempt(() => core.backend.start(mode));
  }),
  cancelLogin: Effect.fn("PublishService.cancelLogin")(function* run() {
    const core = openCore();

    return yield* attempt(() => core.cli.cancelLogin());
  }),
  logout: Effect.fn("PublishService.logout")(function* run() {
    const core = openCore();

    return yield* attempt(() => core.cli.logout());
  }),
  setAccount: Effect.fn("PublishService.setAccount")(function* run(
    accountId: string | null
  ) {
    const core = openCore();

    return yield* attempt(() => core.cli.setAccount(accountId));
  }),
  startLogin: Effect.fn("PublishService.startLogin")(function* run(
    isKeyring: boolean,
    isNarrow: boolean
  ) {
    const core = openCore();

    return yield* attempt(() => core.cli.startLogin(isKeyring, isNarrow));
  }),
};

const makeApi = (cf: CfCliApi): PublishServiceApi => ({
  ...setupApi,
  deleteComment: Effect.fn("PublishService.deleteComment")(function* run(
    projectId: string,
    publicationId: string,
    commentId: string
  ) {
    const core = openCore();
    const found = yield* readOwned(core, projectId, publicationId);

    yield* remote(() => deleteRemoteComment(core, found.id, commentId));
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
    const core = openCore();
    const found = yield* readOwned(core, projectId, publicationId);

    if (found.backend !== "app") {
      return yield* new BadRequest({
        message: "Old per-design Workers have no versions to roll back to.",
      });
    }

    const saved = yield* locked(core, found.id, () =>
      rollbackRemote(core, found, versionId)
    );

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

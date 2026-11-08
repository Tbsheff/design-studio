import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type {
  PublicationCommentList,
  PublicationList,
  PublishBackendState,
  PublishCliState,
} from "@design-studio/actions/publish/schema";
import { Context, Effect, Layer } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import { toPublishCore } from "./publish-core.js";
import type { PublishCore } from "./publish-core.js";
import { listMerged, listRemoteComments } from "./publish-remote-reads.js";
import { studioErrors } from "./remote.js";
import { toPublication } from "./store.js";
import type { PublicationRecord } from "./store.js";

interface PublishStoreApi {
  readonly backendState: (
    isCheck: boolean
  ) => Effect.Effect<PublishBackendState>;
  readonly cliState: (isFresh: boolean) => Effect.Effect<PublishCliState>;
  readonly comments: (
    projectId: string,
    publicationId: string
  ) => Effect.Effect<PublicationCommentList, KnownFailure>;
  readonly list: (projectId: string) => Effect.Effect<PublicationList>;
}

const toCore = (): PublishCore => toPublishCore(loadConfig().dataDir);

const getOwned = (
  core: PublishCore,
  projectId: string,
  publicationId: string
): Effect.Effect<PublicationRecord, NotFound> =>
  Effect.gen(function* owned() {
    const found = yield* Effect.promise(() => core.files.get(publicationId));

    if (!found || found.projectId !== projectId) {
      return yield* new NotFound({
        message: "The publication does not exist.",
      });
    }

    return found;
  });

class PublishStore extends Context.Service<PublishStore, PublishStoreApi>()(
  "design-studio/publish/PublishStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    PublishStore,
    PublishStore.of({
      backendState: Effect.fn("PublishStore.backendState")(function* run(
        isCheck: boolean
      ) {
        const core = toCore();

        return yield* Effect.promise(() => core.backend.state(isCheck));
      }),
      cliState: Effect.fn("PublishStore.cliState")(function* run(
        isFresh: boolean
      ) {
        const core = toCore();

        return yield* Effect.promise(() => core.cli.state(isFresh));
      }),
      comments: Effect.fn("PublishStore.comments")(function* run(
        projectId: string,
        publicationId: string
      ) {
        const core = toCore();
        const found = yield* getOwned(core, projectId, publicationId);

        if (found.backend !== "app") {
          return { comments: [] };
        }

        const reply = yield* attemptKnown(() =>
          studioErrors(() => listRemoteComments(core, found.id))
        );

        return { comments: reply.comments };
      }),
      list: Effect.fn("PublishStore.list")(function* run(projectId: string) {
        const core = toCore();
        const records = yield* Effect.promise(() => core.files.list(projectId));

        const plain: PublicationList = {
          backendError: null,
          publications: records.map((record) => toPublication(record)),
        };

        if (!records.some((record) => record.backend === "app")) {
          return plain;
        }

        return yield* Effect.tryPromise({
          catch: (error) =>
            (error instanceof Error && error.message) || String(error),
          try: () => listMerged(core, projectId, records),
        }).pipe(
          Effect.match({
            onFailure: (failure) => ({
              ...plain,
              backendError: failure,
            }),
            onSuccess: (merged) => merged,
          })
        );
      }),
    })
  );
}

export { PublishStore };

export type { PublishStoreApi };

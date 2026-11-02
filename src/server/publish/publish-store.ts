import { Context, Effect, Layer } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { RemotePublication } from "../../shared/actions/publish-remote.js";
import type {
  PublicationCommentList,
  PublicationList,
  PublishBackendState,
  PublishCliState,
} from "../../shared/actions/publish/schema.js";
import { loadConfig } from "../platform/config/index.js";
import { NotFoundError } from "../store/errors.js";
import { toPublishCore } from "./publish-core.js";
import type { PublishCore } from "./publish-core.js";
import { remoteClient, studioErrors } from "./remote.js";
import { mergeRemote } from "./service.js";
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
  ) => Effect.Effect<PublicationCommentList, BadRequest | NotFound>;
  readonly list: (projectId: string) => Effect.Effect<PublicationList>;
}

const openCore = (): PublishCore => toPublishCore(loadConfig().dataDir);

const toMessage = (error: Cause.UnknownError): string => {
  if (error.cause instanceof Error) {
    return error.cause.message;
  }

  return String(error.cause);
};

const toReadError = (error: Cause.UnknownError): BadRequest | NotFound => {
  if (error.cause instanceof NotFoundError) {
    return new NotFound({ message: error.cause.message });
  }

  return new BadRequest({ message: toMessage(error) });
};

const mergeAll = async (
  core: PublishCore,
  projectId: string,
  records: readonly PublicationRecord[]
): Promise<PublicationList> => {
  const endpoint = await core.backend.endpoint();
  const reply = await remoteClient(endpoint).list(projectId);

  const remote = new Map<string, RemotePublication>(
    reply.publications.map((entry) => [entry.id, entry])
  );

  const merged = records.map((record) => {
    const found = remote.get(record.id);

    if (record.backend === "app" && found) {
      return mergeRemote(record, found, endpoint.url);
    }

    return record;
  });

  return {
    backendError: null,
    publications: merged.map((record) => toPublication(record)),
  };
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
        const core = openCore();

        return yield* Effect.promise(() => core.backend.state(isCheck));
      }),
      cliState: Effect.fn("PublishStore.cliState")(function* run(
        isFresh: boolean
      ) {
        const core = openCore();

        return yield* Effect.promise(() => core.cli.state(isFresh));
      }),
      comments: Effect.fn("PublishStore.comments")(function* run(
        projectId: string,
        publicationId: string
      ) {
        const core = openCore();
        const found = yield* readOwned(core, projectId, publicationId);

        if (found.backend !== "app") {
          return { comments: [] };
        }

        const reply = yield* Effect.tryPromise(() =>
          studioErrors(async () =>
            remoteClient(await core.backend.endpoint()).comments(found.id)
          )
        ).pipe(Effect.mapError((failure) => toReadError(failure)));

        return { comments: reply.comments };
      }),
      list: Effect.fn("PublishStore.list")(function* run(projectId: string) {
        const core = openCore();
        const records = yield* Effect.promise(() => core.files.list(projectId));

        const plain: PublicationList = {
          backendError: null,
          publications: records.map((record) => toPublication(record)),
        };

        if (!records.some((record) => record.backend === "app")) {
          return plain;
        }

        return yield* Effect.tryPromise(() =>
          mergeAll(core, projectId, records)
        ).pipe(
          Effect.match({
            onFailure: (failure) => ({
              ...plain,
              backendError: toMessage(failure),
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

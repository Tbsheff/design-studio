import { Context, Effect, Layer } from "effect";

import type { ApprovalCard } from "../../shared/actions/_core/approval-card.js";
import type { ShareList } from "../../shared/actions/share/schema.js";
import { loadConfig } from "../platform/config/index.js";
import { attemptShare } from "./share-attempt.js";
import type { ShareError } from "./share-attempt.js";
import { createCard, revokeCard } from "./share-cards.js";
import { toServerState, toShareCore } from "./share-core.js";
import type { CreateRequest } from "./share-links.js";
import { toLink } from "./store.js";

interface ShareStoreApi {
  readonly createCard: (
    input: CreateRequest
  ) => Effect.Effect<ApprovalCard, ShareError>;
  readonly deleteCard: (
    projectId: string,
    shareId: string
  ) => Effect.Effect<ApprovalCard, ShareError>;
  readonly list: (projectId: string) => Effect.Effect<ShareList>;
}

const readList = async (projectId: string): Promise<ShareList> => {
  const { dataDir } = loadConfig();
  const core = toShareCore(dataDir);
  const now = Date.now();
  const records = await core.files.list(projectId);

  const links = records
    .map((record) => toLink(record, now, core.hub.count(record.id)))
    .toSorted((left, right) => right.createdAt - left.createdAt);

  return { links, server: toServerState(dataDir) };
};

class ShareStore extends Context.Service<ShareStore, ShareStoreApi>()(
  "design-studio/share/ShareStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ShareStore,
    ShareStore.of({
      createCard: Effect.fn("ShareStore.createCard")(function* run(
        input: CreateRequest
      ) {
        return yield* attemptShare((parts) => createCard(parts, input));
      }),
      deleteCard: Effect.fn("ShareStore.deleteCard")(function* run(
        projectId: string,
        shareId: string
      ) {
        return yield* attemptShare((parts) =>
          revokeCard(parts, projectId, shareId)
        );
      }),
      list: Effect.fn("ShareStore.list")(function* run(projectId: string) {
        return yield* Effect.promise(() => readList(projectId));
      }),
    })
  );
}

export { ShareStore };

export type { ShareStoreApi };

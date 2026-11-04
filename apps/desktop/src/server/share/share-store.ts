import { Context, Effect, Layer } from "effect";

import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import type { ShareList } from "@design-studio/actions/share/schema";
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

const listShares = Effect.fn("ShareStore.list")(function* run(
  projectId: string
) {
  const { dataDir } = loadConfig();
  const core = toShareCore(dataDir);
  const now = Date.now();
  const records = yield* Effect.promise(() => core.files.list(projectId));

  const links = records
    .map((record) => toLink(record, now, core.hub.count(record.id)))
    .toSorted((left, right) => right.createdAt - left.createdAt);

  const list: ShareList = { links, server: toServerState(dataDir) };

  return list;
});

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
      list: listShares,
    })
  );
}

export { ShareStore };

export type { ShareStoreApi };

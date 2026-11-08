import type {
  ShareCreated,
  ShareLinkResult,
  ShareRevoked,
} from "@design-studio/actions/share/schema";
import { Context, Effect, Layer } from "effect";

import { attemptShare } from "./share-attempt.js";
import type { ShareError } from "./share-attempt.js";
import {
  createLink,
  revokeLink,
  setCursor,
  setStudioCursor,
} from "./share-links.js";
import type { CreateRequest, CursorRequest } from "./share-links.js";

interface ShareLinkStoreApi {
  readonly create: (
    input: CreateRequest
  ) => Effect.Effect<ShareCreated, ShareError>;
  readonly revoke: (
    projectId: string,
    shareId: string
  ) => Effect.Effect<ShareRevoked, ShareError>;
  readonly setCursor: (
    projectId: string,
    input: CursorRequest
  ) => Effect.Effect<Record<string, never>, ShareError>;
  readonly setStudioCursor: (
    projectId: string,
    shareId: string,
    isOn: boolean
  ) => Effect.Effect<ShareLinkResult, ShareError>;
}

class ShareLinkStore extends Context.Service<
  ShareLinkStore,
  ShareLinkStoreApi
>()("design-studio/share/ShareLinkStore") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ShareLinkStore,
    ShareLinkStore.of({
      create: Effect.fn("ShareLinkStore.create")(function* run(
        input: CreateRequest
      ) {
        return yield* attemptShare((parts) => createLink(parts, input));
      }),
      revoke: Effect.fn("ShareLinkStore.revoke")(function* run(
        projectId: string,
        shareId: string
      ) {
        return yield* attemptShare((parts) =>
          revokeLink(parts, projectId, shareId)
        );
      }),
      setCursor: Effect.fn("ShareLinkStore.setCursor")(function* run(
        projectId: string,
        input: CursorRequest
      ) {
        return yield* attemptShare((parts) =>
          setCursor(parts, projectId, input)
        );
      }),
      setStudioCursor: Effect.fn("ShareLinkStore.setStudioCursor")(
        function* run(projectId: string, shareId: string, isOn: boolean) {
          return yield* attemptShare((parts) =>
            setStudioCursor(parts, projectId, shareId, isOn)
          );
        }
      ),
    })
  );
}

export { ShareLinkStore };

export type { ShareLinkStoreApi };

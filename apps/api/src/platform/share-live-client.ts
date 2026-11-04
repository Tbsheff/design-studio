import { Context, Effect, Layer } from "effect";

import { CloudBindings } from "./bindings.js";
import type { ShareLive } from "./share-live.js";

interface ShareLiveClientApi {
  readonly open: (
    orgId: string,
    shareId: string,
    request: Request
  ) => Effect.Effect<Response>;
  readonly revoke: (orgId: string, shareId: string) => Effect.Effect<number>;
}

const toShareLiveName = (orgId: string, shareId: string): string =>
  `${orgId}:${shareId}`;

class ShareLiveClient extends Context.Service<
  ShareLiveClient,
  ShareLiveClientApi
>()("design-studio/platform/ShareLiveClient") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    ShareLiveClient,
    Effect.gen(function* make() {
      const { shareLive } = yield* CloudBindings;

      const stubOf = (
        orgId: string,
        shareId: string
      ): DurableObjectStub<ShareLive> =>
        shareLive.get(shareLive.idFromName(toShareLiveName(orgId, shareId)));

      return ShareLiveClient.of({
        open: Effect.fn("ShareLiveClient.open")(function* run(
          orgId: string,
          shareId: string,
          request: Request
        ) {
          return yield* Effect.promise(() =>
            stubOf(orgId, shareId).fetch(request)
          );
        }),
        revoke: Effect.fn("ShareLiveClient.revoke")(function* run(
          orgId: string,
          shareId: string
        ) {
          return yield* Effect.promise(() => stubOf(orgId, shareId).revoke());
        }),
      });
    })
  );
}

export { ShareLiveClient };

export type { ShareLiveClientApi };

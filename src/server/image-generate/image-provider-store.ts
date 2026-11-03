import { Context, Effect, Layer } from "effect";

import { messageOf, readChoice } from "./provider-env.js";
import type { ImageProviderName } from "./provider-env.js";

interface ImageProviderStatus {
  readonly isMock: boolean;
  readonly isReady: boolean;
  readonly message: string | null;
  readonly provider: ImageProviderName;
}

interface ImageProviderStoreApi {
  readonly inspect: () => Effect.Effect<ImageProviderStatus>;
}

const toStatus = (): ImageProviderStatus => {
  const choice = readChoice();
  const problem = messageOf(choice);

  return {
    isMock: choice.name === "mock",
    isReady: problem === null,
    message: problem,
    provider: choice.name,
  };
};

class ImageProviderStore extends Context.Service<
  ImageProviderStore,
  ImageProviderStoreApi
>()("design-studio/image-generate/ImageProviderStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ImageProviderStore,
    ImageProviderStore.of({
      inspect: Effect.fn("ImageProviderStore.inspect")(function* run() {
        return yield* Effect.sync(toStatus);
      }),
    })
  );
}

export { ImageProviderStore };

export type { ImageProviderStoreApi, ImageProviderStatus };

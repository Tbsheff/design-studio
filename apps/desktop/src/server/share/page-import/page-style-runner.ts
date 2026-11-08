import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Context, Effect, Layer } from "effect";

import { sampleStyle } from "./style-sample.js";
import type { StyleSample } from "./style-sample.js";

interface SampleStyleCommand {
  readonly url: string;
}

interface PageStyleRunnerApi {
  readonly sample: (
    command: SampleStyleCommand
  ) => Effect.Effect<StyleSample, BadRequest | Unavailable>;
}

class PageStyleRunner extends Context.Service<
  PageStyleRunner,
  PageStyleRunnerApi
>()("design-studio/share/PageStyleRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    PageStyleRunner,
    PageStyleRunner.of({
      sample: Effect.fn("PageStyleRunner.sample")(function* run(
        command: SampleStyleCommand
      ) {
        const result = yield* Effect.promise(() => sampleStyle(command.url));

        if (result.ok) {
          return result.sample;
        }

        if (result.code === "bad_url") {
          return yield* new BadRequest({ message: result.message });
        }

        return yield* new Unavailable({ message: result.message });
      }),
    })
  );
}

export { PageStyleRunner };

export type { PageStyleRunnerApi, SampleStyleCommand };

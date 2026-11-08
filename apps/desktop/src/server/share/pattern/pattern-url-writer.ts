import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Context, Effect, Layer } from "effect";

import { setPrivateJson } from "./deps.js";
import type { Project } from "./deps.js";
import type { StoredPattern } from "./pattern-model.js";
import { toPatternFile } from "./pattern-paths.js";
import { captureUrlPattern } from "./url/pattern-url-capture.js";
import { toProjectEntries } from "./url/pattern-url-entries.js";

interface ImportUrlCommand {
  readonly name: string;
  readonly project: Project;
  readonly selector: string;
  readonly url: string;
  readonly width: number;
}

interface PatternUrlWriterApi {
  readonly import: (
    command: ImportUrlCommand
  ) => Effect.Effect<StoredPattern, BadRequest | Unavailable>;
}

class PatternUrlWriter extends Context.Service<
  PatternUrlWriter,
  PatternUrlWriterApi
>()("design-studio/share/PatternUrlWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    PatternUrlWriter,
    PatternUrlWriter.of({
      import: Effect.fn("PatternUrlWriter.import")(function* run(
        command: ImportUrlCommand
      ) {
        const entries = yield* Effect.promise(() =>
          toProjectEntries(command.project)
        );

        const result = yield* Effect.promise(() =>
          captureUrlPattern({
            entries,
            name: command.name,
            projectId: command.project.id,
            selector: command.selector,
            url: command.url,
            width: command.width,
          })
        );

        if (!result.ok) {
          if (result.code === "bad_url") {
            return yield* new BadRequest({ message: result.message });
          }

          return yield* new Unavailable({ message: result.message });
        }

        yield* setPrivateJson(toPatternFile(result.pattern.id), result.pattern);

        return result.pattern;
      }),
    })
  );
}

export { PatternUrlWriter };

export type { ImportUrlCommand, PatternUrlWriterApi };

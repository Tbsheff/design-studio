import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Context, Effect, Layer } from "effect";

import { loadConfig } from "../../platform/config/index.js";
import { toRepoSource } from "../engine/to-repo-source.js";
import { cloneRepo } from "./repo-clone-steps.js";

interface RepoCloneRunnerApi {
  readonly clone: (
    url: string
  ) => Effect.Effect<string, BadRequest | Unavailable>;
}

const BAD_URL_MESSAGE =
  "Use an https URL on github.com, gitlab.com or bitbucket.org, or an https URL that ends in .git. Leave out any user name or password.";

class RepoCloneRunner extends Context.Service<
  RepoCloneRunner,
  RepoCloneRunnerApi
>()("design-studio/project-ops/RepoCloneRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    RepoCloneRunner,
    RepoCloneRunner.of({
      clone: Effect.fn("RepoCloneRunner.clone")(function* run(url: string) {
        const source = toRepoSource(url);

        if (source === null) {
          return yield* new BadRequest({ message: BAD_URL_MESSAGE });
        }

        return yield* cloneRepo(
          source.url,
          source.name,
          loadConfig().projectsDir
        );
      }),
    })
  );
}

export { RepoCloneRunner };

export type { RepoCloneRunnerApi };

import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { importProject } from "@design-studio/actions/project/import";
import { Effect } from "effect";

import { ProjectOpsWriter, RepoCloneRunner } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type ImportProjectInput = Input<typeof importProject>;

const SOURCE_MESSAGE = "Pass a path or a url. Do not pass both.";

const handle = Effect.fn("project.import")(function* run(
  input: ImportProjectInput
) {
  const writer = yield* ProjectOpsWriter;
  const runner = yield* RepoCloneRunner;

  if (input.url !== null && input.path !== null) {
    return yield* new BadRequest({ message: SOURCE_MESSAGE });
  }

  if (input.url !== null) {
    const folder = yield* runner.clone(input.url);

    return yield* writer.importFolder({ ...input, path: folder });
  }

  if (input.path === null) {
    return yield* new BadRequest({ message: SOURCE_MESSAGE });
  }

  return yield* writer.importFolder({ ...input, path: input.path });
}) satisfies Handle<typeof importProject>;

export { handle };

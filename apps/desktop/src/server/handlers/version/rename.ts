import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { renameVersion } from "@design-studio/actions/version/rename";
import { VersionWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type RenameVersionInput = Input<typeof renameVersion>;

const handle = Effect.fn("version.rename")(function* run(
  input: RenameVersionInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.rename({
    name: input.name,
    projectId: input.projectId,
    versionId: input.versionId,
  });
}) satisfies Handle<typeof renameVersion>;

export { handle };

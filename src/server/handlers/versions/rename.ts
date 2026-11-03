import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { renameVersions } from "../../../shared/actions/versions/rename.js";
import { VersionWriter } from "../../store/version-writer.js";
import type { Handle } from "../_core/handler.js";

type RenameVersionsInput = Input<typeof renameVersions>;

const handle = Effect.fn("versions.rename")(function* run(
  input: RenameVersionsInput
) {
  const writer = yield* VersionWriter;

  return yield* writer.rename({
    name: input.name,
    projectId: input.projectId,
    versionId: input.versionId,
  });
}) satisfies Handle<typeof renameVersions>;

export { handle };

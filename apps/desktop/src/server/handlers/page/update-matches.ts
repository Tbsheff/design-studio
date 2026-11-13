import type { Input } from "@design-studio/actions/_core/action";
import type { updateMatchesPage } from "@design-studio/actions/page/update-matches";
import { Effect } from "effect";

import { PageMatchWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateMatchesPageInput = Input<typeof updateMatchesPage>;

const handle = Effect.fn("page.updateMatches")(function* run(
  input: UpdateMatchesPageInput
) {
  const writer = yield* PageMatchWriter;

  return yield* writer.update({
    directionId: input.directionId,
    file: input.file,
    projectId: input.projectId,
    selector: input.selector,
    targets: input.targets,
  });
}) satisfies Handle<typeof updateMatchesPage>;

export { handle };

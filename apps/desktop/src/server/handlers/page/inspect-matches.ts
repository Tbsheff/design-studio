import type { Input } from "@design-studio/actions/_core/action";
import type { inspectMatchesPage } from "@design-studio/actions/page/inspect-matches";
import { Effect } from "effect";

import { PageMatchStore } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type InspectMatchesPageInput = Input<typeof inspectMatchesPage>;

const handle = Effect.fn("page.inspectMatches")(function* run(
  input: InspectMatchesPageInput
) {
  const store = yield* PageMatchStore;

  return yield* store.inspect({
    directionId: input.directionId,
    file: input.file,
    projectId: input.projectId,
    selector: input.selector,
    versionId: input.versionId,
  });
}) satisfies Handle<typeof inspectMatchesPage>;

export { handle };

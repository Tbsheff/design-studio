import type { Input } from "@design-studio/actions/_core/action";
import type { inspectImageSearch } from "@design-studio/actions/image-search/inspect";
import { Effect } from "effect";

import { ImageSearchStore } from "../../share/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type InspectImageSearchInput = Input<typeof inspectImageSearch>;

const handle = Effect.fn("image-search.inspect")(function* run(
  input: InspectImageSearchInput
) {
  const projects = yield* ProjectStore;
  const store = yield* ImageSearchStore;
  const project = yield* projects.get(input.projectId);

  return yield* store.inspect(project, {
    limit: input.limit,
    orientation: input.orientation,
    query: input.query,
  });
}) satisfies Handle<typeof inspectImageSearch>;

export { handle };

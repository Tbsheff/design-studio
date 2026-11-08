import type { Input } from "@design-studio/actions/_core/action";
import type { getImageSearch } from "@design-studio/actions/image-search/get";
import { Effect } from "effect";

import { ImageSearchStore } from "../../share/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type GetImageSearchInput = Input<typeof getImageSearch>;

const handle = Effect.fn("image-search.get")(function* run(
  input: GetImageSearchInput
) {
  const projects = yield* ProjectStore;
  const store = yield* ImageSearchStore;
  const project = yield* projects.get(input.projectId);

  return yield* store.status(project);
}) satisfies Handle<typeof getImageSearch>;

export { handle };

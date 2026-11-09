import type { Input } from "@design-studio/actions/_core/action";
import type { getActivityStudio } from "@design-studio/actions/studio/get-activity";
import { Effect } from "effect";

import { ActivityStore } from "../../mcp-life/index.js";
import type { Handle } from "../_core/handler.js";

type GetActivityStudioInput = Input<typeof getActivityStudio>;

const handle = Effect.fn("studio.getActivity")(function* run(
  input: GetActivityStudioInput
) {
  const store = yield* ActivityStore;

  return yield* store.read(input.limit);
}) satisfies Handle<typeof getActivityStudio>;

export { handle };

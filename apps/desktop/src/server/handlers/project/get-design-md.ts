import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getDesignMdProject } from "@design-studio/actions/project/get-design-md";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type GetDesignMdProjectInput = Input<typeof getDesignMdProject>;

const handle = Effect.fn("project.getDesignMd")(function* run(
  input: GetDesignMdProjectInput
) {
  const store = yield* ProjectStore;
  const content = yield* store.readDesignMd(input.projectId);

  return { content: content ?? "" };
}) satisfies Handle<typeof getDesignMdProject>;

export { handle };

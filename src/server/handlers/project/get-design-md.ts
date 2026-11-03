import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getDesignMdProject } from "../../../shared/actions/project/get-design-md.js";
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

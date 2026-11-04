import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { setDesignMdProject } from "@design-studio/actions/project/set-design-md";
import { ProjectOpsWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type SetDesignMdProjectInput = Input<typeof setDesignMdProject>;

const handle = Effect.fn("project.setDesignMd")(function* run(
  input: SetDesignMdProjectInput
) {
  const writer = yield* ProjectOpsWriter;

  return yield* writer.setDesignMd(input.projectId, input.content);
}) satisfies Handle<typeof setDesignMdProject>;

export { handle };

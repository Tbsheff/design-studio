import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setDesignMdProject } from "../../../shared/actions/project/set-design-md.js";
import { ProjectOpsWriter } from "../../project-ops/index.js";
import type { Handle } from "../_core/handler.js";

type SetDesignMdProjectsInput = Input<typeof setDesignMdProject>;

const handle = Effect.fn("project.setDesignMd")(function* run(
  input: SetDesignMdProjectsInput
) {
  const writer = yield* ProjectOpsWriter;

  return yield* writer.setDesignMd(input.projectId, input.content);
}) satisfies Handle<typeof setDesignMdProject>;

export { handle };

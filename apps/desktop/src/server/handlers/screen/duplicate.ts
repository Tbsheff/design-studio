import type { Input } from "@design-studio/actions/_core/action";
import type { duplicateScreen } from "@design-studio/actions/screen/duplicate";
import { Effect } from "effect";

import { ScreenWriter } from "../../export/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type DuplicateScreenInput = Input<typeof duplicateScreen>;

const MAIN_DIRECTION = "main";

const handle = Effect.fn("screen.duplicate")(function* run(
  input: DuplicateScreenInput
) {
  const writer = yield* ScreenWriter;
  const projects = yield* ProjectStore;
  const project = yield* projects.get(input.projectId);

  const main =
    project.directions.find((direction) => direction.id === MAIN_DIRECTION) ??
    project.directions[0];

  return yield* writer.duplicate({
    directionId: input.directionId ?? main?.id ?? MAIN_DIRECTION,
    from: input.from,
    path: input.path,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof duplicateScreen>;

export { handle };

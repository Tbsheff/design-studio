import type { Input } from "@design-studio/actions/_core/action";
import type { createScreen } from "@design-studio/actions/screen/create";
import { Effect } from "effect";

import { ScreenWriter } from "../../export/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type CreateScreenInput = Input<typeof createScreen>;

const MAIN_DIRECTION = "main";

const handle = Effect.fn("screen.create")(function* run(
  input: CreateScreenInput
) {
  const writer = yield* ScreenWriter;
  const projects = yield* ProjectStore;
  const project = yield* projects.get(input.projectId);

  const main =
    project.directions.find((direction) => direction.id === MAIN_DIRECTION) ??
    project.directions[0];

  return yield* writer.create({
    directionId: input.directionId ?? main?.id ?? MAIN_DIRECTION,
    group: input.group,
    layout: input.layout,
    path: input.path,
    projectId: input.projectId,
    title: input.title,
  });
}) satisfies Handle<typeof createScreen>;

export { handle };

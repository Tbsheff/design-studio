import type { Input } from "@design-studio/actions/_core/action";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { inspectScreen } from "@design-studio/actions/screen/inspect";
import { Effect } from "effect";

import { ScreenStore } from "../../app/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type InspectScreenInput = Input<typeof inspectScreen>;

const MAIN_DIRECTION = "main";

const handle = Effect.fn("screen.inspect")(function* run(
  input: InspectScreenInput
) {
  const store = yield* ScreenStore;
  const projects = yield* ProjectStore;
  const project = yield* projects.get(input.projectId);

  const direction =
    project.directions.find((item) => item.id === MAIN_DIRECTION) ??
    project.directions.at(0) ??
    null;

  if (direction === null) {
    return yield* new NotFound({
      message: "This project has no design yet.",
    });
  }

  const { cursor, limit, path } = input;

  return yield* store.inspect({ cursor, direction, limit, path, project });
}) satisfies Handle<typeof inspectScreen>;

export { handle };

import type { Input } from "@design-studio/actions/_core/action";
import type { createFixture } from "@design-studio/actions/fixture/create";
import { Effect } from "effect";

import { FixtureWriter } from "../../export/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type CreateFixtureInput = Input<typeof createFixture>;

const MAIN_DIRECTION = "main";

const handle = Effect.fn("fixture.create")(function* run(
  input: CreateFixtureInput
) {
  const writer = yield* FixtureWriter;
  const projects = yield* ProjectStore;
  const project = yield* projects.get(input.projectId);

  const main =
    project.directions.find((direction) => direction.id === MAIN_DIRECTION) ??
    project.directions[0];

  return yield* writer.create({
    directionId: input.directionId ?? main?.id ?? MAIN_DIRECTION,
    params: input.params,
    projectId: input.projectId,
    route: input.route,
    searchParams: input.searchParams,
    shell: input.shell,
  });
}) satisfies Handle<typeof createFixture>;

export { handle };

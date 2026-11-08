import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { getDataModel } from "@design-studio/actions/data-model/get";
import { Effect } from "effect";

import { DataModelStore, toAppRoot } from "../../app/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type GetDataModelInput = Input<typeof getDataModel>;

const handle = Effect.fn("data-model.get")(function* run(
  input: GetDataModelInput
) {
  const projects = yield* ProjectStore;
  const store = yield* DataModelStore;
  const project = yield* projects.get(input.projectId);
  const appRoot = toAppRoot(project);

  if (appRoot === null) {
    return yield* new BadRequest({
      message: "This project has no attached app. Attach an app first.",
    });
  }

  return yield* store.get({
    appRoot,
    limit: input.limit,
    model: input.model,
    rows: input.rows,
    seed: input.seed,
    variant: input.variant,
  });
}) satisfies Handle<typeof getDataModel>;

export { handle };

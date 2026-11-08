import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { listDataModel } from "@design-studio/actions/data-model/list";
import { Effect } from "effect";

import { DataModelStore, toAppRoot } from "../../app/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ListDataModelInput = Input<typeof listDataModel>;

const handle = Effect.fn("data-model.list")(function* run(
  input: ListDataModelInput
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

  return yield* store.list({
    appRoot,
    cursor: input.cursor,
    limit: input.limit,
    query: input.query,
  });
}) satisfies Handle<typeof listDataModel>;

export { handle };

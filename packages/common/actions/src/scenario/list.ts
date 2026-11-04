import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  DirectionIdSchema,
  FrameIdSchema,
  ProjectIdSchema,
} from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { ScenarioSchema } from "./schema.js";

const listScenario = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_scenario",
    set: "core",
    short:
      "List the saved data scenarios for one frame: id, kind, name and the calls each one answers.",
  },
  confirm: "none",
  description:
    "List the saved data scenarios for one app frame. Each row has an id, a kind (filled, empty, long, error or loading), a name and the browser calls it answers. Run create_scenario first. Reads only saved files.",
  errors: [BadRequest, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/scenario/:frameId",
  },
  id: "scenario.list",
  input: Schema.Struct({
    ...PageFields,
    directionId: DirectionIdSchema,
    frameId: FrameIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_scenario" },
  needs: "project.read",
  output: pageOf(ScenarioSchema),
  scope: "project",
});

export { listScenario };

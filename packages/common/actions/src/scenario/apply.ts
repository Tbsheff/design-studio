import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  DirectionIdSchema,
  FrameIdSchema,
  ProjectIdSchema,
} from "../_core/ids.js";
import { ScenarioAppliedSchema } from "./schema.js";

const applyScenario = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "apply_scenario",
    set: "core",
    short:
      "Bind one saved scenario to a frame, or clear it with scenarioId null. Changes API answers in the preview only.",
  },
  confirm: "none",
  description:
    "Bind one saved data scenario to an app frame, so the frame preview shows that data. Pass scenarioId null to clear it and show the real answers again. Changes only what the browser in the frame gets from /api and tRPC calls. Writes no app source.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/scenario/:frameId/apply",
  },
  id: "scenario.apply",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    frameId: FrameIdSchema,
    projectId: ProjectIdSchema,
    scenarioId: Schema.NullOr(Schema.String),
  }),
  invalidates: ["scenario.list"],
  mcp: { name: "apply_scenario" },
  needs: "project.update",
  output: ScenarioAppliedSchema,
  scope: "project",
});

export { applyScenario };

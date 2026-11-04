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
import { ScenarioRunSchema } from "./schema.js";

const runScenario = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "run_scenario",
    set: "core",
    short:
      "Render every saved scenario of a frame. Per scenario: overflow, clipped text, console errors. Saves a contact sheet PNG.",
  },
  confirm: "none",
  description:
    "Render one app frame in every saved scenario. Returns for each scenario the count of overflowing and clipped elements and the console errors, and writes one contact sheet PNG with all renders. Does not change the scenario bound to the frame. Writes no app source.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/scenario/:frameId/run",
  },
  id: "scenario.run",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    frameId: FrameIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["scenario.list"],
  mcp: { name: "run_scenario" },
  needs: "project.update",
  output: ScenarioRunSchema,
  scope: "project",
});

export { runScenario };

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
import { ScenarioSetSchema } from "./schema.js";

const createScenario = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_scenario",
    set: "core",
    short:
      "Record a frame's browser API calls and save 5 data scenarios (filled, empty, long, error, loading). Keeps shapes, never values.",
  },
  confirm: "none",
  description:
    "Open one app frame, record the structure of each browser /api and /trpc call (keys, value types, array lengths, never values) and save five data scenarios for it: filled, empty, long, error and loading. Server component and server-side calls are not seen. Writes no app source.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/scenario/:frameId",
  },
  id: "scenario.create",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    frameId: FrameIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["scenario.list"],
  mcp: { name: "create_scenario" },
  needs: "project.update",
  output: ScenarioSetSchema,
  scope: "project",
});

export { createScenario };

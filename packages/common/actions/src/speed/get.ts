import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { SpeedGetFields, SpeedResultSchema } from "./schema.js";

const getSpeed = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_speed",
    set: "app",
    short:
      "Read the last result of run_speed: each number, its change and the largest images.",
  },
  confirm: "none",
  description:
    "Read the last result of run_speed for one frame. It shows the phase of the last run, whether the route came from a dev server, each number with its baseline and change, and the 3 largest images. Run run_speed first. Its measure has the numbers and the images. The lists are empty when no run is saved.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/speed" },
  id: "speed.get",
  input: Schema.Struct({
    ...SpeedGetFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "get_speed" },
  needs: "project.read",
  output: SpeedResultSchema,
  scope: "project",
});

export { getSpeed };

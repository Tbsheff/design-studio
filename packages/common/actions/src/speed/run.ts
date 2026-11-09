import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { SpeedResultSchema, SpeedRunFields } from "./schema.js";

const runSpeed = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "run_speed",
    set: "app",
    short:
      "Check page speed of a frame route. Save a baseline, then compare after an edit.",
  },
  confirm: "none",
  description:
    "Check the page speed of one frame route before and after an edit. Pass phase baseline to load the route headless with a cold cache and keep the median numbers. Make the edit. Pass phase compare to load it again. Each number comes back with its change against the baseline: largest contentful paint, layout shift, total blocking time, transfer bytes and font count. The 3 largest images are listed, and new ones are marked. The result says when the route comes from a dev server. It writes no project file. Read the last result with get_speed.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/speed/run" },
  id: "speed.run",
  input: Schema.Struct({
    ...SpeedRunFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["speed.get"],
  mcp: { name: "run_speed" },
  needs: "project.update",
  output: SpeedResultSchema,
  scope: "project",
});

export { runSpeed };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  FlowBuiltSchema,
  FlowParamsSchema,
  FlowRouteSchema,
} from "./schema.js";

const createFlowCanvas = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Lay out app route frames left to right and make prototype links from the links in their source. Pass routes, or from with depth. Frames already on the canvas are reused. Attached Next.js apps only. Dynamic segments get the sample params, saved for the next flow.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/flow" },
  id: "canvas.createFlow",
  input: Schema.Struct({
    depth: Schema.optionalKey(
      Schema.Int.check(Schema.isBetween({ maximum: 4, minimum: 0 }))
    ),
    from: Schema.optionalKey(FlowRouteSchema),
    params: Schema.optionalKey(FlowParamsSchema),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    routes: Schema.optionalKey(
      Schema.Array(FlowRouteSchema).check(
        Schema.isMinLength(1),
        Schema.isMaxLength(24)
      )
    ),
  }),
  invalidates: ["canvas.getDoc", "canvas.listFlowParams", "canvas.listLinks"],
  mcp: { name: "add_flow" },
  needs: "project.update",
  output: FlowBuiltSchema,
  scope: "project",
});

export { createFlowCanvas };

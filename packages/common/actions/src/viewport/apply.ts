import { Effect, Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { ViewportFixedSchema, ViewportFixFields } from "./schema.js";

const toNullDirection = Effect.succeed(null);

const ApplyDirectionSchema = Schema.NullOr(DirectionIdSchema)
  .annotate({
    description: "Direction id. Leave out for the main direction.",
  })
  .pipe(Schema.withDecodingDefaultKey(toNullDirection));

const applyViewport = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "apply_viewport",
    set: "core",
    short:
      "Fix viewport findings with edits scoped to each width, then check the page again.",
  },
  confirm: "none",
  description:
    "Fix viewport findings with scoped class edits. Run the viewport check at each width, then add Tailwind max-* classes or a media rule that fix overflow, clipped text, small tap targets and sideways scroll. Dry run lists the edits and writes nothing. A real run saves one version, then runs the check again.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/viewport/apply" },
  id: "viewport.apply",
  input: Schema.Struct({
    directionId: ApplyDirectionSchema,
    ...ViewportFixFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getTree", "workspace.getFrameHtml"],
  mcp: { name: "apply_viewport" },
  needs: "project.update",
  output: ViewportFixedSchema,
  scope: "project",
});

export { applyViewport };

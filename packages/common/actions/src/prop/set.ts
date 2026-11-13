import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { Forbidden } from "../_core/errors/forbidden.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "../direct-edit/errors/direct-edit-conflict.js";
import { DirectEditFailed } from "../direct-edit/errors/direct-edit-failed.js";
import { DirectEditNotFound } from "../direct-edit/errors/direct-edit-not-found.js";
import { SetPropsFields } from "../direct-edit/payload/schema.js";
import { SetPropsResultSchema } from "../direct-edit/schema.js";

const setProp = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    'Change the props of one component instance, the same as the Component section of the studio inspector: it adds, replaces or removes JSX attributes at the use site (for example <Button variant="outline"> to variant="destructive") and keeps the rest of the file as it was. One version and one undo step. Props set by an expression are refused.',
  errors: [
    Forbidden,
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/props",
  },
  id: "prop.set",
  input: Schema.Struct({
    ...SetPropsFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["version.list", "version.get"],
  mcp: { name: "set_props" },
  needs: "project.update",
  output: SetPropsResultSchema,
  scope: "project",
});

export { setProp };

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
import { CritiqueSchema } from "./schema.js";

const runCritique = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "run_critique",
    set: "core",
    short:
      "Critique one frame with a model: five scores and up to 12 issues with fixes. Saves the result. Writes no file.",
  },
  confirm: "none",
  description:
    "Render one canvas frame and ask a model to critique its design. Reads DESIGN.md and the taste rules. Returns five scores from 0 to 10 for hierarchy, spacing, type, color and copy, and up to 12 issues, each with a layer id when known, a severity and a fix. Saves the result for get_critique. Writes no project file.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/critique/:frameId/run",
  },
  id: "critique.run",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    frameId: FrameIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["critique.get"],
  mcp: { name: "run_critique" },
  needs: "project.update",
  output: CritiqueSchema,
  scope: "project",
});

export { runCritique };

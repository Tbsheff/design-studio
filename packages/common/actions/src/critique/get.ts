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

const getCritique = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_critique",
    set: "core",
    short:
      "Read the last saved critique of one frame: five scores and the issues. No model call.",
  },
  confirm: "none",
  description:
    "Read the last saved design critique of one canvas frame. Returns five scores from 0 to 10 for hierarchy, spacing, type, color and copy, and up to 12 issues with a fix for each. Makes no model call. Run run_critique first to make a critique.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/critique/:frameId",
  },
  id: "critique.get",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    frameId: FrameIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "get_critique" },
  needs: "project.read",
  output: CritiqueSchema,
  scope: "project",
});

export { getCritique };

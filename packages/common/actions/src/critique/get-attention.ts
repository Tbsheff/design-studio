import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import {
  DirectionIdSchema,
  FrameIdSchema,
  ProjectIdSchema,
} from "../_core/ids.js";
import { AttentionSavedSchema } from "./schema.js";

const getAttentionCritique = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_attention_critique",
    set: "core",
    short:
      "Read the last saved attention map of one frame: clarity score, ranked elements and notes. No render.",
  },
  confirm: "none",
  description:
    "Read the last saved attention map of one canvas frame. Returns the clarity score from 0 to 100, the ranked elements with their share of attention, the notes and the heatmap path, or null when none is saved. Makes no render and no model call. Run run_attention_critique first to make one.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/critique/:frameId/attention",
  },
  id: "critique.getAttention",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    frameId: FrameIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "get_attention_critique" },
  needs: "project.read",
  output: AttentionSavedSchema,
  scope: "project",
});

export { getAttentionCritique };

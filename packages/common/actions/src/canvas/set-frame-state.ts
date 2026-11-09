import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  FrameMockSchema,
  FrameRefSchema,
  FrameStateIdSchema,
  FrameStateSetSchema,
} from "./schema.js";

const setFrameStateCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_frame_state",
    set: "app",
    short:
      "Attached apps only. Show one frame in a preview state (default, session, empty, loading, error, mock). Changes no file.",
  },
  confirm: "none",
  description:
    "Show one app frame in a preview state: default, session, empty, loading, error, an existing mock state id, or mock to make a new mock state. Mock steps (click, hover or focus on a selector, at most 4) run after each load, so a dialog, sheet, menu, tab or tooltip stays open in the frame. The frame reloads in the studio. Use get_screenshot with frameId to see it.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/frame-states/frames/:frame",
  },
  id: "canvas.setFrameState",
  input: Schema.Struct({
    frame: FrameRefSchema.annotate({
      description: "Frame id or @label from canvas_list.",
    }),
    mock: Schema.optionalKey(FrameMockSchema),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    state: FrameStateIdSchema,
  }),
  invalidates: ["canvas.listFrameStates"],
  mcp: { name: "set_frame_state" },
  needs: "project.update",
  output: FrameStateSetSchema,
  scope: "project",
});

export { setFrameStateCanvas };

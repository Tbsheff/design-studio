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
import {
  CanWriteFieldSchema,
  MaxStepsFieldSchema,
  PersonaFieldSchema,
  TaskFieldSchema,
  WalkthroughSchema,
} from "./schema.js";

const runWalkthrough = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "run_walkthrough",
    set: "core",
    short:
      "Walk a synthetic user through a task on one frame: steps, outcome and friction notes. Saves the result. Writes no project file.",
  },
  confirm: "none",
  description:
    "Run a synthetic user through one task across the screens of a frame. The runner opens the frame, lists the visible controls on each screen, and a model picks one action per step: click, type, scroll, done or stuck. Returns the outcome, the steps with screenshots, friction notes with fixes, and a contact sheet of all steps. Saves the result for get_walkthrough. Writes no project file.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/walkthroughs" },
  id: "walkthrough.run",
  input: Schema.Struct({
    canWrite: CanWriteFieldSchema,
    directionId: Schema.NullOr(DirectionIdSchema),
    frameId: FrameIdSchema,
    maxSteps: MaxStepsFieldSchema,
    persona: PersonaFieldSchema,
    projectId: ProjectIdSchema,
    task: TaskFieldSchema,
  }),
  invalidates: ["walkthrough.get"],
  mcp: { name: "run_walkthrough" },
  needs: "project.update",
  output: WalkthroughSchema,
  scope: "project",
});

export { runWalkthrough };

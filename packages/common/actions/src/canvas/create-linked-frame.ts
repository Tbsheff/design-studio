import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  LinkedFrameCreatedSchema,
  LinkedFrameFields,
} from "./linked-frame/schema.js";

const createLinkedFrameCanvas = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "create_linked_frame_canvas",
    set: "core",
    short:
      "Add a page and a frame for the screen that a button or link opens, and link them. Pass shouldStartRun false, then write the page.",
  },
  confirm: "none",
  description:
    "Add a new HTML page, a canvas frame to the right of fromFrame that shows it, and a prototype link from the element at selector on fromFrame to the new frame, as one version. The page copies the head of the source page and has an empty body. With shouldStartRun true, a run starts that designs the page from the prompt. HTML projects only; an app uses create_screen.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/canvas/linked-frames",
  },
  id: "canvas.createLinkedFrame",
  input: Schema.Struct({
    ...LinkedFrameFields,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: [
    "canvas.getDoc",
    "canvas.listLinks",
    "version.list",
    "run.list",
  ],
  mcp: { name: "create_linked_frame_canvas" },
  needs: "project.update",
  output: LinkedFrameCreatedSchema,
  scope: "project",
});

export { createLinkedFrameCanvas };

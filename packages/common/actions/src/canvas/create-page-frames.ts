import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  PageFramesCreatedSchema,
  PageFramesFields,
} from "./page-frames/schema.js";

const createPageFramesCanvas = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "create_page_frames_canvas",
    set: "core",
    short:
      "Give each linked HTML page that has no frame its own labelled frame, right of the frame that links to it, in one step.",
  },
  confirm: "none",
  description:
    "For an HTML project, add a canvas frame for each page that a link reaches from a framed page and that has no frame. Each new frame goes right of the frame that links to it, in link order, with the page title as its label and the size of the source frame. Pass pages to limit the new frames to those page paths, or null for every unframed linked page. Sets the first start point when none is set. One version, one undo step. HTML projects only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/canvas/page-frames" },
  id: "canvas.createPageFrames",
  input: Schema.Struct({
    ...PageFramesFields,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: [
    "canvas.getDoc",
    "canvas.listLinks",
    "canvas.listImplicitLinks",
    "version.list",
  ],
  mcp: { name: "create_page_frames_canvas" },
  needs: "project.update",
  output: PageFramesCreatedSchema,
  scope: "project",
});

export { createPageFramesCanvas };

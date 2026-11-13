import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  FrameImportedSchema,
  FrameImportFields,
} from "./frame-import/schema.js";

const importFrameCanvas = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "import_frame_canvas",
    set: "core",
    short:
      "Add a page and a frame from an attached screenshot, and start a run that rebuilds it in this project's style.",
  },
  confirm: "none",
  description:
    "Add a new HTML page and a canvas frame from a screenshot attachment, as one version. The page copies the head of the nearest page, so it uses the project tokens and fonts. With shouldStartRun true, a run starts that rebuilds the screenshot in the page, with the image as the reference picture. HTML projects only; an app uses create_screen.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/canvas/frames/import",
  },
  id: "canvas.importFrame",
  input: Schema.Struct({
    ...FrameImportFields,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
  }),
  invalidates: ["canvas.getDoc", "version.list", "run.list"],
  mcp: { name: "import_frame_canvas" },
  needs: "project.update",
  output: FrameImportedSchema,
  scope: "project",
});

export { importFrameCanvas };

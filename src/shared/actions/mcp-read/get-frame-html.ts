import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { FrameHtmlSchema, PathTextSchema } from "./schema.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects",
});

const VersionFieldSchema = Schema.String.annotate({
  description:
    "Version id. Leave out for the newest saved version of the main direction.",
});

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const PageFieldSchema = PathTextSchema.annotate({
  description:
    'Page path inside the project, for example "about.html". Leave out for the entry page.',
});

const getFrameHtmlMcpRead = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Get the HTML of one page. Static HTML projects return the source file. React projects return the rendered DOM. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/frame-html" },
  id: "mcp-read.getFrameHtml",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    path: Schema.optionalKey(PageFieldSchema),
    projectId: ProjectFieldSchema,
    versionId: Schema.optionalKey(VersionFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "get_frame_html" },
  needs: "project.read",
  output: FrameHtmlSchema,
  scope: "project",
});

export { getFrameHtmlMcpRead };

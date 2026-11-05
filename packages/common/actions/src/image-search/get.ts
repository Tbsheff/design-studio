import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ImageSearchProjectFields, ImageSearchStatusSchema } from "./schema.js";

const getImageSearch = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read the image search status of one project: whether the environment variable STUDIO_IMAGE_SEARCH is on, whether the project setting imageSearch is on, whether search is on, and the message to show when it is off. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/image-search" },
  id: "image-search.get",
  input: Schema.Struct({
    ...ImageSearchProjectFields,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: ImageSearchStatusSchema,
  scope: "project",
});

export { getImageSearch };

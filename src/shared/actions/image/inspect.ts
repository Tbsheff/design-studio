import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ImageStatusSchema } from "./schema.js";

const inspectImage = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "inspect_image",
    set: "core",
    short:
      "Show which image provider the studio uses for generate_image and if it is ready.",
  },
  confirm: "none",
  description:
    "Show the image provider for generate_image: mock, openai or gemini, and whether it is ready. The studio never returns the key.",
  errors: [BadRequest, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/image-generate",
  },
  id: "image.inspect",
  input: Schema.Struct({ projectId: ProjectIdSchema }),
  invalidates: [],
  mcp: { name: "inspect_image" },
  needs: "project.read",
  output: ImageStatusSchema,
  scope: "project",
});

export { inspectImage };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { ImageCreatedSchema, ImageCreateFields } from "./schema.js";

const createImage = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_image",
    set: "core",
    short:
      "Generate an image from a prompt, save it in the project assets and set it on a layer as one version.",
  },
  confirm: "none",
  description:
    "Generate an image from a prompt with the studio image provider. aspect is square, wide, tall or hero. style is photo, illustration, icon or abstract. The file goes in the project assets folder with a content-hashed name. With layer, the image is set on that layer (src of an img, a background image, or a new img) with the prompt as alt text, as one version named Generate image. Without layer, the image is only saved. reuse places an earlier result without a new generation. With no key the provider is mock and the image is a gradient.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/images",
  },
  id: "image.create",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...ImageCreateFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [
    "canvas.getDoc",
    "direct-edit.getTree",
    "version.list",
    "version.listHistory",
  ],
  mcp: { name: "create_image" },
  needs: "project.update",
  output: ImageCreatedSchema,
  scope: "project",
});

export { createImage };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { ImageCreatedSchema, ImageEditFields } from "./schema.js";

const updateImage = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "update_image",
    set: "core",
    short:
      "Remove the background, upscale or change the image of a layer with a prompt, as one undoable version.",
  },
  confirm: "none",
  description:
    "Edit the image of a layer with the studio image provider. mode is remove-background, upscale or prompt. prompt is required for the prompt mode and is null for the other modes. The studio sends the current image to the provider, saves the result in the project assets folder with a content-hashed name and sets it on the layer as one version named Edit image. Undo restores the old image. With no key the provider is mock and the edit is a local transform.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/images/edit",
  },
  id: "image.update",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...ImageEditFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [
    "canvas.getDoc",
    "direct-edit.getTree",
    "version.list",
    "version.listHistory",
  ],
  mcp: { name: "update_image" },
  needs: "project.update",
  output: ImageCreatedSchema,
  scope: "project",
});

export { updateImage };

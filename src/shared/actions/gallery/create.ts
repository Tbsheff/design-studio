import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { GalleryCreatedSchema, GalleryFields } from "./schema.js";

const createGallery = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_gallery",
    set: "design-system",
    short:
      "Place canvas frames with a labeled grid of every variant, size and state of one component, in light and dark.",
  },
  confirm: "none",
  description:
    "Place a component gallery on the canvas. Name a component from the kit or the repo inventory. The gallery is a grid with one row per variant and one column per size and state (default, hover, focus, disabled). It is placed as a light frame and a dark frame under the existing frames, with row and column labels. props sets overrides for every cell. Frames of an earlier gallery of the same component are reused. Hover and focus are forced by style, not by a pointer.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/component-gallery",
  },
  id: "gallery.create",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...GalleryFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["canvas.getDoc", "gallery.inspect"],
  mcp: { name: "create_gallery" },
  needs: "project.update",
  output: GalleryCreatedSchema,
  scope: "project",
});

export { createGallery };

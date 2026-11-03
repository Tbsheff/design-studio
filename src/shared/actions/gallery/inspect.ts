import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { GalleryInspectedSchema, GalleryInspectFields } from "./schema.js";

const inspectGallery = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "inspect_gallery",
    set: "design-system",
    short:
      "List the cells of a component gallery with their prop combos, render errors and contrast failures.",
  },
  confirm: "none",
  description:
    "List the cells of the component gallery of one component. Each cell has its variant, size, state and prop combo, for light and dark. A cell reports a render error when it shows nothing or throws, and a contrast failure when its text is under 4.5 to 1 on its background (3 to 1 for large text). Run create_gallery first.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/component-gallery",
  },
  id: "gallery.inspect",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...GalleryInspectFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "inspect_gallery" },
  needs: "project.read",
  output: GalleryInspectedSchema,
  scope: "project",
});

export { inspectGallery };

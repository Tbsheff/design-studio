import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  ImagePlacedSchema,
  ImageSearchDirectionFields,
  ImageSearchInsertFields,
} from "./schema.js";

const insertImageSearch = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "place_image",
    set: "core",
    short:
      "Download one search_images result into the project assets, set it on an img or background with alt text, and credit it in ASSETS.md.",
  },
  confirm: "none",
  description:
    "Place one search_images result on a layer as one version. The studio downloads the photo by its id, copies it into the project assets folder with a content-hashed name, sets it with the set_image code (src on an img, background-image on an element with a background image or with mode background, or a new img inside other elements), writes alt, and adds the author, license and source link to ASSETS.md. One undo step. Needs image search to be on.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/image-search/place",
  },
  id: "image-search.insert",
  input: Schema.Struct({
    ...ImageSearchDirectionFields,
    ...ImageSearchInsertFields,
  }),
  invalidates: ["version.list"],
  mcp: { name: "place_image" },
  needs: "project.update",
  output: ImagePlacedSchema,
  scope: "project",
});

export { insertImageSearch };

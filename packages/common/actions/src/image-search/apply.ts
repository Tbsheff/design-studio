import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  ImageSearchApplyFields,
  ImageSearchDirectionFields,
  PhotoFillSchema,
} from "./schema.js";

const applyImageSearch = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "apply_image_search",
    set: "core",
    short:
      "Fill every data-photo slot on one page with a distinct image search photo, as one version and one undo step.",
  },
  confirm: "none",
  description:
    "Fill every photo slot on one page in one call. A slot is an img or an element with a data-photo attribute that holds 2 to 6 search words. For each slot the studio searches the words, with the orientation from the slot width and height, takes the first result that the page does not use yet, copies it into the project assets folder, sets it as src or as a background image, removes data-photo and credits it in ASSETS.md. All slots change in one version and one undo step. A slot with no result gets studio art on an HTML page and is listed in missed. A filled background slot loses its plain text label. A page with no slot left returns at once with a note and runs no search, so call it once per page. A slot with data-photo-art holds studio art and counts as open. When image search is off, the call runs no search: the studio paints each plain slot with art from the page colors and returns a note.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/image-search/apply",
  },
  id: "image-search.apply",
  input: Schema.Struct({
    ...ImageSearchDirectionFields,
    ...ImageSearchApplyFields,
  }),
  invalidates: ["version.list"],
  mcp: { name: "apply_image_search" },
  needs: "project.update",
  output: PhotoFillSchema,
  scope: "project",
});

export { applyImageSearch };

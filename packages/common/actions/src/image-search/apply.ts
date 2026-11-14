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
    "Fill every photo slot on one page, as one version and one undo step. A slot is an img or an element with a data-photo attribute that holds 2 to 6 search words. A data-photo-art slot holds studio art and counts as open. For each slot the studio searches the words, takes the first photo not on the page yet, copies it into the assets folder, sets it as src or background image and credits it in ASSETS.md. A slot with no result gets studio art and is listed in missed. A page with no open slot returns a note and runs no search. When image search is off, each slot gets art from the page colors.",
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

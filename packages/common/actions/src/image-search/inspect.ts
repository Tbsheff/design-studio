import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  ImageSearchInspectFields,
  ImageSearchProjectFields,
  ImageSearchResultSchema,
} from "./schema.js";

const inspectImageSearch = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "search_images",
    set: "core",
    short:
      "Read only. Search free Creative Commons stock photos (Openverse). Search words only; the studio sends no project data. Off until image search is on.",
  },
  confirm: "none",
  description:
    "Search free stock photos with Creative Commons licenses (Openverse, no key). query is the search words only; the studio sends no other project data. orientation is any, wide, tall or square; limit is 1 to 30 (default 12). Each result has id, thumbnailUrl, fullUrl, width, height, author, license, licenseUrl and sourceUrl. Pass a result id to place_image. The network is off until STUDIO_IMAGE_SEARCH=on or the project setting imageSearch is true.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/image-search/photos" },
  id: "image-search.inspect",
  input: Schema.Struct({
    ...ImageSearchProjectFields,
    ...ImageSearchInspectFields,
  }),
  invalidates: [],
  mcp: { name: "search_images" },
  needs: "project.read",
  output: ImageSearchResultSchema,
  scope: "project",
});

export { inspectImageSearch };

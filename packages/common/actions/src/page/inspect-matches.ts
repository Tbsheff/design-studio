import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  PageMatchesSchema,
  PageMatchSourceFields,
  PageMatchVersionSchema,
} from "./match/schema.js";

const inspectMatchesPage = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "inspect_matches_page",
    set: "core",
    short:
      "Find the pages that hold the same element as one layer, such as a nav or footer, to edit them all.",
  },
  confirm: "none",
  description:
    "Find the other HTML pages of this direction that hold the same element as one layer, such as a nav or footer. A page matches when it has an element with the same tag and the same markup, with whitespace, aria-current and active classes ignored. A page whose copy changed on its own is listed with isSame false.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/pages/matches",
  },
  id: "page.inspectMatches",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...PageMatchSourceFields,
    projectId: ProjectIdSchema,
    versionId: PageMatchVersionSchema,
  }),
  invalidates: [],
  mcp: { name: "inspect_matches_page" },
  needs: "project.read",
  output: PageMatchesSchema,
  scope: "project",
});

export { inspectMatchesPage };

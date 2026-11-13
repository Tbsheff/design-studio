import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  PageMatchesUpdatedSchema,
  PageMatchSourceFields,
  PageMatchTargetsSchema,
} from "./match/schema.js";

const updateMatchesPage = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "update_matches_page",
    set: "core",
    short:
      "Copy one layer's current markup to the same element on other pages, as one version.",
  },
  confirm: "none",
  description:
    "Copy the current markup of one layer to the same element on other HTML pages of this direction, such as a nav or footer, as one version and one undo step. Each page keeps its own aria-current and active classes. Call inspect_matches_page first to get the targets.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/pages/matches",
  },
  id: "page.updateMatches",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...PageMatchSourceFields,
    projectId: ProjectIdSchema,
    targets: PageMatchTargetsSchema,
  }),
  invalidates: ["page.inspectMatches", "version.list"],
  mcp: { name: "update_matches_page" },
  needs: "project.update",
  output: PageMatchesUpdatedSchema,
  scope: "project",
});

export { updateMatchesPage };

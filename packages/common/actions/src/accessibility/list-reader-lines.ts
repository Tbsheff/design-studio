import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import {
  ReaderLineFields,
  ReaderLineSchema,
  ReaderLinesTotalsFields,
} from "./schema.js";

const listReaderLinesAccessibility = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_reader_lines_accessibility",
    set: "app",
    short:
      "Read only. List the lines a screen reader says for a frame, in order, with role, name, states and a mark when the name is missing.",
  },
  confirm: "none",
  description:
    "List the lines that a screen reader says for one canvas frame, in DOM order. Each line has the role, the accessible name, the states (checked, expanded, disabled, heading level), the depth, isNameMissing, and the layerId of the source element when one maps. Hidden sr-only text shows as a name or a text line. The lines follow the browser accessibility tree rules for roles and names. They are not a real VoiceOver or NVDA run. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/accessibility/reader-lines",
  },
  id: "accessibility.listReaderLines",
  input: Schema.Struct({
    ...PageFields,
    ...ReaderLineFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_reader_lines_accessibility" },
  needs: "project.read",
  output: pageOf(ReaderLineSchema, ReaderLinesTotalsFields),
  scope: "project",
});

export { listReaderLinesAccessibility };

import {
  JSX_IMPORTS_MAX,
  JSX_INSERT_POSITIONS,
  JSX_SNIPPET_MAX,
} from "@design-studio/contracts/insert";
import { Effect, Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { OwnedElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "./errors/direct-edit-conflict.js";
import { DirectEditFailed } from "./errors/direct-edit-failed.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { InsertResultSchema } from "./schema.js";

const IMPORT_FILE_MAX = 1000;

const IMPORT_NAME = /^[A-Z][A-Za-z0-9_$]{0,63}$/u;

const hasImportCount = Schema.makeFilter(
  (value: Readonly<Record<string, string>>) =>
    Object.keys(value).length <= JSX_IMPORTS_MAX
);

const ImportNameSchema = Schema.String.check(Schema.isPattern(IMPORT_NAME));

const ImportFileSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(IMPORT_FILE_MAX)
);

const ImportsSchema = Schema.Record(ImportNameSchema, ImportFileSchema)
  .check(hasImportCount)
  .annotate({
    description:
      'Only when two library components have the same name: component name to its file, relative to the project, for example {"Button": "packages/ui/src/components/button.tsx"}.',
  });

const JsxSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(JSX_SNIPPET_MAX)
).annotate({
  description:
    "The snippet: one or more elements, with line breaks and any indent.",
});

const PositionSchema = Schema.Literals(JSX_INSERT_POSITIONS)
  .annotate({
    description:
      "inside: after the last child of the target. before / after: a sibling of the target. replace: the snippet takes the place of the target element.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed("inside" as const)));

const insertJsxDirectEdit = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "insert_jsx",
    set: "core",
    short:
      "Insert a JSX snippet inside, before, after or in place of a target. Adds kit imports. Markup only.",
  },
  confirm: "none",
  description:
    "Build a group of elements in one call: insert a JSX snippet (or an HTML snippet in an HTML project) inside, before, after or in place of the target element. Each component tag that the target file does not import is found in the project library, and its import line is added or extended. Markup only: text, string props, numbers, style objects and plain references to names the file has. Functions, hook calls, conditions, .map() and spreads are refused with a reason. Targets made by .map() are refused. One version and one undo step. To remove placeholder text next to child elements, use clear_text.",
  errors: [
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/insert/jsx",
  },
  id: "direct-edit.insertJsx",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    imports: Schema.optionalKey(ImportsSchema),
    jsx: JsxSchema,
    position: PositionSchema,
    projectId: ProjectIdSchema,
    target: OwnedElementTargetSchema,
  }),
  invalidates: ["direct-edit.getTree", "version.list", "version.listHistory"],
  mcp: { name: "insert_jsx" },
  needs: "project.update",
  output: InsertResultSchema,
  scope: "project",
});

export { insertJsxDirectEdit };

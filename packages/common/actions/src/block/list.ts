import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { BlockListFields, BlockSchema } from "./schema.js";

const listBlock = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_block",
    set: "kit",
    short:
      "List starter page blocks (stats, table, form, empty state, auth and more) built from the project kit. Shows missing kit parts.",
  },
  confirm: "none",
  description:
    "List the starter page blocks that the project can insert, with kind, the kit components each block uses and the names this project lacks. A missing component is drawn as plain markup. Filter by text or kind. Each block has a preview path when a PNG was rendered for the current kit.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/blocks" },
  id: "block.list",
  input: Schema.Struct({
    ...PageFields,
    ...BlockListFields,
  }),
  invalidates: [],
  mcp: { name: "list_block" },
  needs: "studio.read",
  output: pageOf(BlockSchema),
  scope: "project",
});

export { listBlock };

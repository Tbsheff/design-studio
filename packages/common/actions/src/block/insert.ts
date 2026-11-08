import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { BlockInsertedSchema, BlockInsertFields } from "./schema.js";

const insertBlock = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "insert_block",
    set: "kit",
    short:
      "Insert a starter page block (stats row, table, form, auth card and more) built from the project kit. One version.",
  },
  confirm: "none",
  description:
    "Insert a starter page block in one version and one undo step. Pick a block id from list_block. Put it inside, before or after the element that a CSS selector names, or give a file:line:col source location. With no target it goes at the end of main. In a React project it imports the real kit components and draws each missing one as plain markup. In an HTML project it writes class markup. The result lists the layer ids, the added imports and the parts drawn as plain markup.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/blocks/insert" },
  id: "block.insert",
  input: Schema.Struct(BlockInsertFields),
  invalidates: ["canvas.getDoc", "version.list"],
  mcp: { name: "insert_block" },
  needs: "project.update",
  output: BlockInsertedSchema,
  scope: "project",
});

export { insertBlock };

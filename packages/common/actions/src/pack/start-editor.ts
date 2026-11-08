import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PackIdSchema } from "../_core/ids.js";
import { CheckFailed } from "./errors/check-failed.js";
import { PackExists } from "./errors/pack-exists.js";
import { EditorResultSchema } from "./schema.js";

const startEditorPack = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "start_editor_pack",
    set: "design-system",
    short:
      "Open the draft project of a user design system for editing. Makes a new draft project when none exists.",
  },
  confirm: "none",
  description:
    "Open the draft project of a user design system so it can be edited. It returns the project that backs the pack, or makes a new one with a kit page.",
  errors: [BadRequest, CheckFailed, Conflict, NotFound, PackExists],
  http: { method: "POST", path: "/api/packs/:packId/editor" },
  id: "pack.startEditor",
  input: Schema.Struct({
    packId: PackIdSchema,
  }),
  invalidates: ["pack.list"],
  mcp: { name: "start_editor_pack" },
  needs: "pack.write",
  output: EditorResultSchema,
  scope: "org",
});

export { startEditorPack };

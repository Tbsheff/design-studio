import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { CheckFailed } from "./errors/check-failed.js";
import { PackExists } from "./errors/pack-exists.js";
import { ImportResultSchema } from "./schema.js";

const ImportModeSchema = Schema.Literals(["ask", "replace", "copy"]);

const ContentSchema = Schema.String.annotate({
  description: "The zip file as base64 text, at most 2 MB.",
});

const importPackPack = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Import a design system zip in the export format as a new user pack. Mode ask fails with pack_exists when a user pack has the same id or name; replace and copy settle it.",
  errors: [BadRequest, CheckFailed, Conflict, NotFound, PackExists],
  http: { method: "POST", path: "/api/packs/import" },
  id: "pack.importPack",
  input: Schema.Struct({
    content: ContentSchema,
    mode: Schema.optionalKey(ImportModeSchema),
  }),
  invalidates: ["pack.listSummary", "pack.list", "pack.getPack"],
  mcp: { off: "legacy-mcp" },
  needs: "pack.write",
  output: ImportResultSchema,
  scope: "org",
});

export { importPackPack };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PackIdSchema } from "../_core/ids.js";
import { CheckFailed } from "./errors/check-failed.js";
import { PackExists } from "./errors/pack-exists.js";
import { PackSummarySchema } from "./schema.js";

const duplicatePackPack = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Copy a built-in or user design system to a new user pack. Leave out the name for the default name, which is the old name and copy.",
  errors: [BadRequest, CheckFailed, Conflict, NotFound, PackExists],
  http: { method: "POST", path: "/api/packs/:packId/duplicate" },
  id: "pack.duplicatePack",
  input: Schema.Struct({
    name: Schema.optionalKey(Schema.String),
    packId: PackIdSchema,
  }),
  invalidates: ["pack.listSummary", "pack.list", "pack.getPack"],
  mcp: { off: "legacy-mcp" },
  needs: "pack.write",
  output: PackSummarySchema,
  scope: "org",
});

export { duplicatePackPack };

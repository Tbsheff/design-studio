import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PackIdSchema } from "../_core/ids.js";
import { CheckFailed } from "./errors/check-failed.js";
import { PackExists } from "./errors/pack-exists.js";
import { PackSummarySchema } from "./schema.js";

const duplicatePackPacks = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Copy a built-in or user design system to a new user pack. Leave out the name for the default name, which is the old name and copy.",
  errors: [BadRequest, CheckFailed, Conflict, NotFound, PackExists],
  http: { method: "POST", path: "/api/packs/:packId/duplicate" },
  id: "packs.duplicatePack",
  input: Schema.Struct({
    name: Schema.optionalKey(Schema.String),
    packId: PackIdSchema,
  }),
  invalidates: ["packs.listSummary", "packs.list", "packs.getPack"],
  mcp: { off: "ui-bootstrap" },
  needs: "pack.write",
  output: PackSummarySchema,
  scope: "org",
});

export { duplicatePackPacks };

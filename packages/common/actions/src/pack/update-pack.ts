import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PackIdSchema } from "../_core/ids.js";
import { CheckFailed } from "./errors/check-failed.js";
import { PackExists } from "./errors/pack-exists.js";
import {
  PackFontsInputSchema,
  PackModeInputSchema,
  PackSummarySchema,
  ProvenanceSchema,
  TokensJsonSchema,
} from "./schema.js";

const TagsSchema = Schema.Array(Schema.String);

const updatePackPack = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "update_pack_pack",
    set: "design-system",
    short:
      "Change a user design system in the studio library, for example its name. A built-in pack cannot change.",
  },
  confirm: "none",
  description:
    "Change a user design system in the studio library, for example its name. The pack id does not change. Built-in packs cannot change.",
  errors: [BadRequest, CheckFailed, Conflict, NotFound, PackExists],
  http: { method: "PATCH", path: "/api/packs/:packId" },
  id: "pack.updatePack",
  input: Schema.Struct({
    copiedFrom: Schema.optionalKey(Schema.String),
    description: Schema.optionalKey(Schema.String),
    designMd: Schema.optionalKey(Schema.String),
    draft: Schema.optionalKey(Schema.Boolean),
    fonts: Schema.optionalKey(PackFontsInputSchema),
    license: Schema.optionalKey(Schema.String),
    mode: Schema.optionalKey(PackModeInputSchema),
    name: Schema.optionalKey(Schema.String),
    packId: PackIdSchema,
    provenance: Schema.optionalKey(ProvenanceSchema),
    tags: Schema.optionalKey(TagsSchema),
    tokensJson: Schema.optionalKey(TokensJsonSchema),
  }),
  invalidates: ["pack.listSummary", "pack.list", "pack.getPack"],
  mcp: { name: "update_pack_pack" },
  needs: "pack.write",
  output: PackSummarySchema,
  scope: "org",
});

export { updatePackPack };

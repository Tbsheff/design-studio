import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
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

const createPackPacks = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Create a user design system in the studio library from a name, a mode, fonts and tokens. The new pack id is user- and a slug of the name.",
  errors: [BadRequest, CheckFailed, Conflict, NotFound, PackExists],
  http: { method: "POST", path: "/api/packs" },
  id: "packs.createPack",
  input: Schema.Struct({
    copiedFrom: Schema.optionalKey(Schema.String),
    description: Schema.optionalKey(Schema.String),
    designMd: Schema.String,
    draft: Schema.optionalKey(Schema.Boolean),
    fonts: PackFontsInputSchema,
    license: Schema.optionalKey(Schema.String),
    mode: PackModeInputSchema,
    name: Schema.String,
    provenance: ProvenanceSchema,
    tags: Schema.optionalKey(TagsSchema),
    tokensJson: TokensJsonSchema,
  }),
  invalidates: ["packs.listSummary", "packs.list", "packs.getPack"],
  mcp: { off: "ui-bootstrap" },
  needs: "pack.write",
  output: PackSummarySchema,
  scope: "org",
});

export { createPackPacks };

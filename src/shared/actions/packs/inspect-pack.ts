import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PackIdSchema } from "../_core/ids.js";
import { CheckResultSchema } from "./schema.js";

const inspectPackPacks = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Check one design system in the studio library: tokens, contrast, DESIGN.md and pack fonts. It returns passed and the problems. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/packs/:packId/check" },
  id: "packs.inspectPack",
  input: Schema.Struct({
    packId: PackIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "pack.read",
  output: CheckResultSchema,
  scope: "org",
});

export { inspectPackPacks };

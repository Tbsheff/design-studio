import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PackIdSchema } from "../_core/ids.js";
import { PackDetailSchema } from "./schema.js";

const getPackPack = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read one design system from the studio library: its summary, the tokens.json text, the DESIGN.md text and the compiled token entries. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/packs/:packId/detail" },
  id: "pack.getPack",
  input: Schema.Struct({
    packId: PackIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "pack.read",
  output: PackDetailSchema,
  scope: "org",
});

export { getPackPack };

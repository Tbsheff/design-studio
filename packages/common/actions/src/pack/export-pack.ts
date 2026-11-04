import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PackIdSchema } from "../_core/ids.js";
import { PackFileSchema } from "./schema.js";

const exportPackPack = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Export one design system pack as a zip file with pack.json, tokens.json and DESIGN.md. The zip comes back as base64 text with its file name.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/packs/:packId/export" },
  id: "pack.exportPack",
  input: Schema.Struct({
    packId: PackIdSchema,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "pack.read",
  output: PackFileSchema,
  scope: "org",
});

export { exportPackPack };

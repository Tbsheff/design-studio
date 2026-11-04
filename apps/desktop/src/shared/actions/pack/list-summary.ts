import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { PackSummarySchema } from "./schema.js";

const listSummaryPack = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List every design system pack in the studio library with its full summary: id, name, mode, fonts, swatches, tags, license and source. Built-in packs come first.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/packs" },
  id: "pack.listSummary",
  input: Schema.Struct({
    ...PageFields,
  }),
  invalidates: [],
  mcp: { off: "legacy-mcp" },
  needs: "pack.read",
  output: pageOf(PackSummarySchema),
  scope: "org",
});

export { listSummaryPack };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { PackSummarySchema } from "./schema.js";

const listSummaryPacks = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List every design system pack in the studio library with its full summary: id, name, mode, fonts, swatches, tags, license and source. Built-in packs come first.",
  errors: [BadRequest],
  http: { method: "GET", path: "/api/packs" },
  id: "packs.listSummary",
  input: Schema.Struct({
    ...PageFields,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "pack.read",
  output: pageOf(PackSummarySchema),
  scope: "org",
});

export { listSummaryPacks };

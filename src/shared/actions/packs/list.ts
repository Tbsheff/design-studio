import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { DesignSystemItemSchema } from "./schema.js";

const DraftsFieldSchema = Schema.Boolean.annotate({
  description: "Also list drafts that are not saved to the library yet.",
});

const listPacks = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "List the design systems (packs) in the studio library: id, name, mode, fonts, built-in or user, and a few swatches. Use an id with create_project or apply_design_system.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/design-systems" },
  id: "packs.list",
  input: Schema.Struct({
    ...PageFields,
    drafts: Schema.optionalKey(DraftsFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "list_design_systems" },
  needs: "pack.read",
  output: pageOf(DesignSystemItemSchema),
  scope: "org",
});

export { listPacks };

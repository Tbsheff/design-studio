import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { PackProblemSchema } from "./schema.js";

const listProblemPacks = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the packs that the studio library skipped because a file is missing or not valid, with the reason for each one.",
  errors: [BadRequest],
  http: { method: "GET", path: "/api/packs/problems" },
  id: "packs.listProblem",
  input: Schema.Struct({
    ...PageFields,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "pack.read",
  output: pageOf(PackProblemSchema),
  scope: "org",
});

export { listProblemPacks };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { PackProblemSchema } from "./schema.js";

const listProblemPack = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the packs that the studio library skipped because a file is missing or not valid, with the reason for each one.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/packs/problems" },
  id: "pack.listProblem",
  input: Schema.Struct({
    ...PageFields,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "pack.read",
  output: pageOf(PackProblemSchema),
  scope: "org",
});

export { listProblemPack };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { HiddenCountSchema } from "./schema.js";

const getHiddenProject = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Get the count of projects hidden outside the default folder and the default folder path. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/hidden-projects" },
  id: "project.getHidden",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.read",
  output: HiddenCountSchema,
  scope: "org",
});

export { getHiddenProject };

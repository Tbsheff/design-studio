import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { HiddenMovedSchema } from "./schema.js";

const moveHiddenProject = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Move every hidden project into the default folder. Returns the moved project ids and the failures.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/hidden-projects/move" },
  id: "project.moveHidden",
  input: Schema.Struct({}),
  invalidates: ["project.list", "project.listHidden"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: HiddenMovedSchema,
  scope: "org",
});

export { moveHiddenProject };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { WorkspaceListSchema } from "./schema.js";

const getFoldersWorkspace = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read the saved project folders and the default projects folder. Returns the home folder and each folder with a missing flag.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/workspaces" },
  id: "workspace.getFolders",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "studio.read",
  output: WorkspaceListSchema,
  scope: "org",
});

export { getFoldersWorkspace };

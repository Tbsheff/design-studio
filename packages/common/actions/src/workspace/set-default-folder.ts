import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { WorkspaceListSchema } from "./schema.js";

const setDefaultFolderWorkspace = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_default_folder_workspace",
    set: "core",
    short:
      "Set the default projects folder. The old default stays in the folder list. Returns the folder list.",
  },
  confirm: "none",
  description:
    "Set the default projects folder. The old default stays in the folder list. Returns the folder list.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/workspaces/default" },
  id: "workspace.setDefaultFolder",
  input: Schema.Struct({
    path: Schema.String,
  }),
  invalidates: ["workspace.getFolders", "project.list"],
  mcp: { name: "set_default_folder_workspace" },
  needs: "studio.write",
  output: WorkspaceListSchema,
  scope: "org",
});

export { setDefaultFolderWorkspace };

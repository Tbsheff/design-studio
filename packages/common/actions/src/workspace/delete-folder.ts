import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { WorkspaceRemovedSchema } from "./schema.js";

const deleteFolderWorkspace = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_folder_workspace",
    set: "core",
    short:
      "Remove a saved folder from the folder list. The files stay on disk. The user must allow it. The default folder cannot be removed.",
  },
  confirm: "user",
  description:
    "Remove a saved folder from the folder list. The folder and its files stay on disk. The default folder cannot be removed.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "DELETE", path: "/api/workspaces/:workspaceId" },
  id: "workspace.deleteFolder",
  input: Schema.Struct({
    workspaceId: Schema.String,
  }),
  invalidates: ["workspace.getFolders"],
  mcp: { name: "delete_folder_workspace" },
  needs: "studio.write",
  output: WorkspaceRemovedSchema,
  scope: "org",
});

export { deleteFolderWorkspace };

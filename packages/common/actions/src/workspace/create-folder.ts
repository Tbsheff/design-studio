import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { WorkspaceFolderSchema } from "./schema.js";

const createFolderWorkspace = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_folder_workspace",
    set: "core",
    short:
      "Save an absolute folder path in the studio folder list. Returns the entry. The folder must be outside the studio data folder.",
  },
  confirm: "none",
  description:
    "Save a folder in the folder list. A path that is saved already returns its entry. The path must be an absolute folder outside the studio data folder.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/workspaces" },
  id: "workspace.createFolder",
  input: Schema.Struct({
    label: Schema.optionalKey(Schema.String),
    path: Schema.String,
  }),
  invalidates: ["workspace.getFolders"],
  mcp: { name: "create_folder_workspace" },
  needs: "studio.write",
  output: WorkspaceFolderSchema,
  scope: "org",
});

export { createFolderWorkspace };

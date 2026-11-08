import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { WorkspaceFolderSchema } from "./schema.js";

const renameFolderWorkspace = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Rename a saved folder. The default folder cannot be renamed. Returns the changed folder.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PATCH", path: "/api/workspaces/:workspaceId" },
  id: "workspace.renameFolder",
  input: Schema.Struct({
    label: Schema.String,
    workspaceId: Schema.String,
  }),
  invalidates: ["workspace.getFolders"],
  mcp: { off: "legacy-mcp" },
  needs: "studio.write",
  output: WorkspaceFolderSchema,
  scope: "org",
});

export { renameFolderWorkspace };

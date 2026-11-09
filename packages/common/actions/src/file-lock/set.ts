import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  FileLockGlobsSchema,
  FileLockTargetFields,
  FileLockViewSchema,
} from "./schema.js";

const setFileLock = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_file_lock",
    set: "core",
    short:
      "Set the file paths and folders that Claude may not change in this design.",
  },
  confirm: "none",
  description:
    "Set the lock globs of one design. Claude cannot change a file that matches a lock glob, by any tool or shell command. Hand edits in the code dialog still save. Each glob is relative to the work tree, for example packages/ui/**. Pass at most 100 globs and none with .. in it. The list replaces the old list. Pass an empty list to unlock all.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/d/:directionId/file-lock",
  },
  id: "file-lock.set",
  input: Schema.Struct({
    ...FileLockTargetFields,
    globs: FileLockGlobsSchema,
  }),
  invalidates: ["file-lock.get"],
  mcp: { name: "set_file_lock" },
  needs: "studio.write",
  output: FileLockViewSchema,
  scope: "project",
});

export { setFileLock };

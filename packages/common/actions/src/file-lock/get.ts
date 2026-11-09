import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { FileLockPageFields, FileLockPageSchema } from "./schema.js";

const getFileLock = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_file_lock",
    set: "core",
    short:
      "Read the file paths and folders that Claude may not change in this design.",
  },
  confirm: "none",
  description:
    "Read the lock globs of one design. Claude cannot change a file that matches a lock glob. Each glob is relative to the work tree, for example packages/ui/**. Returns one page of globs, at most limit, and next as the cursor of the next page. Returns an empty list when nothing is locked. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/file-lock",
  },
  id: "file-lock.get",
  input: Schema.Struct(FileLockPageFields),
  invalidates: [],
  mcp: { name: "get_file_lock" },
  needs: "project.read",
  output: FileLockPageSchema,
  scope: "project",
});

export { getFileLock };

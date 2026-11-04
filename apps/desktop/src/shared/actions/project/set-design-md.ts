import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { DesignMdSavedSchema } from "./schema.js";

const setDesignMdProject = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Write the DESIGN.md of one project and save it as a version on the main direction.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/projects/:projectId/design-md" },
  id: "project.setDesignMd",
  input: Schema.Struct({
    content: Schema.String,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["project.getDesignMd"],
  mcp: { off: "legacy-mcp" },
  needs: "project.update",
  output: DesignMdSavedSchema,
  scope: "project",
});

export { setDesignMdProject };

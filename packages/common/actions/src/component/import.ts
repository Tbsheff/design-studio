import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import { ComponentImportedSchema, ComponentImportFields } from "./schema.js";

const importComponent = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "import_component",
    set: "kit",
    short:
      "Add a missing kit component from the shadcn registry into the project kit folder. One version, one undo step.",
  },
  confirm: "none",
  description:
    "Add a missing kit component from the shadcn registry. Reads components.json, fetches the registry item, adds the registry dependencies that the kit lacks and rewrites the imports to the kit aliases. Writes the files in one version and one undo step. It does not run the shadcn CLI and does not edit package.json. The result lists the written files and the npm packages that the kit lacks.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
  http: { method: "POST", path: "/api/projects/:projectId/components/import" },
  id: "component.import",
  input: Schema.Struct(ComponentImportFields),
  invalidates: ["block.list", "workspace.listFiles", "version.list"],
  mcp: { name: "import_component" },
  needs: "studio.write",
  output: ComponentImportedSchema,
  scope: "project",
});

export { importComponent };

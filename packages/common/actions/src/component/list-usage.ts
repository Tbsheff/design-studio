import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import {
  ComponentUsageListFields,
  ComponentUsageTotalsFields,
  ComponentUseCountSchema,
} from "./schema.js";

const listUsageComponent = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "list_usage_component",
    set: "kit",
    short:
      "List kit components with import counts, route counts and sample sites. Pass isUnusedOnly to list parts that nothing imports.",
  },
  confirm: "none",
  description:
    "List the kit components of a direction with how often app source uses each one. A use is a file that imports the component. Each item has name, kit file, import count, route count and up to 3 sample sites with file and line. Pass isUnusedOnly true to list only components with 0 imports.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/components/usage" },
  id: "component.listUsage",
  input: Schema.Struct({
    ...ComponentUsageListFields,
    ...PageFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_usage_component" },
  needs: "project.read",
  output: pageOf(ComponentUseCountSchema, ComponentUsageTotalsFields),
  scope: "project",
});

export { listUsageComponent };

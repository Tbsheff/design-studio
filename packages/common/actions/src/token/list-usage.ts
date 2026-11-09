import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import {
  TokenUsageListFields,
  TokenUsageSchema,
  TokenUsageTotalsFields,
} from "./schema.js";

const listUsageToken = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "list_usage_token",
    set: "core",
    short:
      "List design tokens with use counts and sample sites. Pass isUnusedOnly to list tokens that nothing uses.",
  },
  confirm: "none",
  description:
    "List the design tokens of a direction with how often source code uses each one. A use is var(--name) in CSS, TSX or HTML, a Tailwind class that maps to the token, or an alias from another token. Each item has name, value, use count, file count and up to 3 sample sites with file and line. Pass isUnusedOnly true to list only tokens with 0 uses.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/tokens/usage",
  },
  id: "token.listUsage",
  input: Schema.Struct({
    ...PageFields,
    ...TokenUsageListFields,
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "list_usage_token" },
  needs: "project.read",
  output: pageOf(TokenUsageSchema, TokenUsageTotalsFields),
  scope: "project",
});

export { listUsageToken };

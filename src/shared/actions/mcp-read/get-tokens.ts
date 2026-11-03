import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { TokensViewSchema } from "./schema.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects",
});

const VersionFieldSchema = Schema.String.annotate({
  description:
    "Version id. Leave out for the newest saved version of the main direction.",
});

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const getTokensMcpRead = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Get the design tokens. A studio design system gives tokens.css and each token with its CSS variable and values. An imported app folder gives the tokens of its own CSS file (Tailwind @theme, :root and .dark): each token with its declared value, resolved value, dark value, file and line. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/design-tokens" },
  id: "mcp-read.getTokens",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    projectId: ProjectFieldSchema,
    versionId: Schema.optionalKey(VersionFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "get_tokens" },
  needs: "project.read",
  output: TokensViewSchema,
  scope: "project",
});

export { getTokensMcpRead };

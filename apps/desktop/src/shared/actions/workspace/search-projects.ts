import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ProjectSearchViewSchema } from "./schema.js";

const QUERY_MAX = 100;

const QueryFieldSchema = Schema.String.check(
  Schema.isMaxLength(QUERY_MAX)
).annotate({
  description:
    'Search text, for example "bona" or "/f2f". Leave out for recent projects.',
});

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description:
    "Project id from list_projects whose routes are always searched, like the open project in the studio.",
});

const LIMIT_MAX = 100;

const LimitFieldSchema = Schema.Int.check(
  Schema.isBetween({ maximum: LIMIT_MAX, minimum: 1 })
).annotate({ description: "Most projects to return. Default 20." });

const searchProjectsWorkspace = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    'Find projects and app routes by text, like the studio Cmd+K palette: fuzzy match on the project name and app folder, and on the routes of the matched attached apps (and of projectId when given). Each project has type (next, vite, html, react, design-system), place, updatedAt, openedAt (last opened in the studio, or null) and health (level ok, busy, warn or off with a note such as "Needs install" or "Dev server ready"; null for prototypes). A query that starts with "/" searches the routes of every attached app. An empty query lists recent projects: last opened first, last edited when never opened. Read only.',
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects-search" },
  id: "workspace.searchProjects",
  input: Schema.Struct({
    limit: Schema.optionalKey(LimitFieldSchema),
    projectId: Schema.optionalKey(ProjectFieldSchema),
    query: Schema.optionalKey(QueryFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "search_projects" },
  needs: "project.read",
  output: ProjectSearchViewSchema,
  scope: "org",
});

export { searchProjectsWorkspace };

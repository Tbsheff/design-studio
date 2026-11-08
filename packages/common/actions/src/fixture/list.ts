import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { FixtureProjectFields, FixtureSchema } from "./schema.js";

const listFixture = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_fixture",
    set: "core",
    short: "List the data fixtures of a project with their frame ids.",
  },
  confirm: "none",
  description:
    "List the data fixtures of one project with route, source route, file and canvas frame. A fixture is a generated page that renders a server-data route with client data.",
  errors: [NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/fixtures" },
  id: "fixture.list",
  input: Schema.Struct({
    ...PageFields,
    ...FixtureProjectFields,
  }),
  invalidates: [],
  mcp: { name: "list_fixture" },
  needs: "project.read",
  output: pageOf(FixtureSchema),
  scope: "project",
});

export { listFixture };

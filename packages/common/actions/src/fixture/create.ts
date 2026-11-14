import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  FixtureCreateFields,
  FixtureCreatedSchema,
  FixtureProjectFields,
} from "./schema.js";

const createFixture = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_fixture",
    set: "core",
    short:
      "Make a client-data fixture page from a server-data route so scenarios can drive it. Adds a frame.",
  },
  confirm: "none",
  description:
    "Render one server-data app route as a client-data fixture page. The fixture drops server-side prefetch and hydrate calls, so the browser loads data through /api/trpc and data scenarios can drive it. When this direction has a fixture of the same route, params, query values and shell, and its folder still exists, it reuses that fixture and puts its frame back. Else it writes one page file in the app, adds one canvas frame and saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/fixtures" },
  id: "fixture.create",
  input: Schema.Struct({
    ...FixtureProjectFields,
    ...FixtureCreateFields,
  }),
  invalidates: ["fixture.list", "canvas.getDoc"],
  mcp: { name: "create_fixture" },
  needs: "project.update",
  output: FixtureCreatedSchema,
  scope: "project",
});

export { createFixture };

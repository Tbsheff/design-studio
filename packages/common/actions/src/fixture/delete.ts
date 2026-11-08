import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  FixtureDeletedSchema,
  FixtureIdFields,
  FixtureProjectFields,
} from "./schema.js";

const deleteFixture = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_fixture",
    set: "core",
    short:
      "Delete a data fixture page and its canvas frame after the user approves.",
  },
  confirm: "user",
  description:
    "Delete one data fixture. Removes the generated page file and its canvas frame. The approval card lists both. The source route stays as it is.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "DELETE",
    path: "/api/projects/:projectId/fixtures/:fixtureId",
  },
  id: "fixture.delete",
  input: Schema.Struct({
    ...FixtureIdFields,
    ...FixtureProjectFields,
  }),
  invalidates: ["fixture.list", "canvas.getDoc"],
  mcp: { name: "delete_fixture" },
  needs: "project.update",
  output: FixtureDeletedSchema,
  scope: "project",
});

export { deleteFixture };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { WalkthroughIdSchema, WalkthroughSchema } from "./schema.js";

const getWalkthrough = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_walkthrough",
    set: "core",
    short:
      "Read a saved walkthrough: outcome, steps and friction notes. No browser, no model call.",
  },
  confirm: "none",
  description:
    "Read a saved walkthrough by id. Returns the outcome, the steps with screenshots, the friction notes with fixes and the contact sheet path. Makes no browser run and no model call. Run run_walkthrough first to make a walkthrough.",
  errors: [BadRequest, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/walkthroughs/:walkthroughId",
  },
  id: "walkthrough.get",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    walkthroughId: WalkthroughIdSchema,
  }),
  invalidates: [],
  mcp: { name: "get_walkthrough" },
  needs: "project.read",
  output: WalkthroughSchema,
  scope: "project",
});

export { getWalkthrough };

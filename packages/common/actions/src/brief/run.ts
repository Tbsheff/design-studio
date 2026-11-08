import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import {
  BriefProjectIdFieldSchema,
  BriefPromptFieldSchema,
  BriefResultSchema,
} from "./schema.js";

const runBrief = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "run_brief",
    set: "core",
    short:
      "Expand a short prompt into a grounded design brief. Reads the project DESIGN.md, routes and kit names. Writes nothing.",
  },
  confirm: "none",
  description:
    "Expand a short prompt into a brief of 5 to 10 lines. It covers goal, screens, content, states and style. With a project, it grounds the brief in the DESIGN.md, the routes and the kit component names. Writes nothing.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
  http: { method: "POST", path: "/api/briefs" },
  id: "brief.run",
  input: Schema.Struct({
    projectId: BriefProjectIdFieldSchema,
    prompt: BriefPromptFieldSchema,
  }),
  invalidates: ["brief.run"],
  mcp: { name: "run_brief" },
  needs: "studio.write",
  output: BriefResultSchema,
  scope: "device",
});

export { runBrief };

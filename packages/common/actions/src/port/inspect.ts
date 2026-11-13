import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { NotImplemented } from "../_core/errors/not-implemented.js";
import { ProjectIdSchema } from "../_core/ids.js";

const inspectPort = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "inspect_port",
    set: "app",
    short:
      "Compare the app route you built with its prototype page. Returns a score from 0 to 100 and the areas that differ most.",
  },
  confirm: "none",
  description:
    "Compare an app route with the prototype page it was moved from. The studio renders both pages at one width, scores the match from 0 to 100 (content 20%, edges 80%) and lists the 3x3 areas that differ most. A score under 80 means the route does not match yet. Read only; it writes only a side-by-side diff PNG in the data folder.",
  errors: [BadRequest, Conflict, NotFound, NotImplemented],
  http: { method: "GET", path: "/api/projects/:projectId/port/match" },
  id: "port.inspect",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "inspect_port" },
  needs: "project.read",
  output: Schema.Struct({}),
  scope: "project",
});

export { inspectPort };

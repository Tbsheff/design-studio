import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PortCheckInputSchema, PortMatchSchema } from "./schema.js";

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
    "Compare an app route with the prototype page it was moved from. The studio renders both pages at one width, scores the match from 0 to 100 (content 20%, edges 80%) and lists the 3x3 areas that differ most. For each low area it pairs app and prototype elements and lists the computed values that differ. firstShift names where the content first moved. A score under 80 means the route does not match yet. For a route update, the studio masks the kept app text and the data row text on both pages, and lists them in masked. Read only; it writes a diff PNG in the data folder.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/port/match" },
  id: "port.inspect",
  input: PortCheckInputSchema,
  invalidates: [],
  mcp: { name: "inspect_port" },
  needs: "project.read",
  output: PortMatchSchema,
  scope: "project",
});

export { inspectPort };

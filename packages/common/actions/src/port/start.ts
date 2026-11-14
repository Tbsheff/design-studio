import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PortStartInputSchema, PortStartedSchema } from "./schema.js";

const startPort = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "user",
  description:
    "Move an HTML prototype page, or a flow of pages, into an attached app as new React routes. It checks that each route is new and that no run is active in the app, builds the port plan and the prompt from the plan and the prototype HTML, then starts one studio agent run in the app. The user must click Allow first. Returns the run id; read it with get_run and waitSeconds. Plan first with get_port_plan.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/port/start" },
  id: "port.start",
  input: PortStartInputSchema,
  invalidates: ["run.list"],
  mcp: { name: "start_port" },
  needs: "project.update",
  output: PortStartedSchema,
  scope: "project",
});

export { startPort };

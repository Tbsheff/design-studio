import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { StateRunSchema } from "./states/schema.js";

const startStatesRun = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Start one studio agent run per state of a state board that looks like the default, one after the other. Give the section id of the state board. The server starts the next run when a run ends with success and the next state still looks like the default. A failed or stopped run ends the sequence. Read it with get_states_run. A server restart drops the sequence.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/runs/states" },
  id: "run.startStates",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    section: Schema.String.annotate({
      description:
        'Section id of the state board, as canvas_list shows it (its label is "/<page> states"). Example: "s2".',
    }),
  }),
  invalidates: ["run.list", "run.getStates"],
  mcp: { name: "start_states_run" },
  needs: "project.update",
  output: StateRunSchema,
  scope: "project",
});

export { startStatesRun };

import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, StateSequenceIdSchema } from "../_core/ids.js";
import { StateRunSchema } from "./states/schema.js";

const getStatesRun = defineAction({
  access: "read",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Read one state sequence that start_states_run started: each state of the board with its frame, its run id and its status (waiting, running, done, skipped, failed or stopped). The sequence id is the one that start_states_run returns: states- and the section id, as in states-s2. A server restart drops the sequence.",
  errors: [NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/runs/states/:sequenceId",
  },
  id: "run.getStates",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects.",
    }),
    sequenceId: StateSequenceIdSchema.annotate({
      description: 'Sequence id from start_states_run. Example: "states-s2".',
    }),
  }),
  invalidates: [],
  mcp: { name: "get_states_run" },
  needs: "project.read",
  output: StateRunSchema,
  scope: "project",
});

export { getStatesRun };

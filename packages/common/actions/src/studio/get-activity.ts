import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ActivityLimitSchema, StudioActivitySchema } from "./schema.js";

const getActivityStudio = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_activity_studio",
    set: "core",
    short:
      "Read running and recent runs, approvals that wait on the user, dev servers and MCP clients.",
  },
  confirm: "none",
  description:
    "Read the live Home activity across all projects: running and recent agent runs from chat and MCP with status and cost, MCP approvals that wait on the user, dev servers, MCP clients and the git branch of each app folder. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/activity" },
  id: "studio.getActivity",
  input: Schema.Struct({
    limit: ActivityLimitSchema,
  }),
  invalidates: [],
  mcp: { name: "get_activity_studio" },
  needs: "studio.read",
  output: StudioActivitySchema,
  scope: "org",
});

export { getActivityStudio };

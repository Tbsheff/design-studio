import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  ProposalDirectionFieldSchema,
  RuleProposalsSchema,
} from "./proposal/schema.js";

const inspectProposalsDesignRule = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "inspect_proposals_design_rule",
    set: "core",
    short:
      "List style changes the user made by hand more than once, as proposed design rules, to match the user's taste.",
  },
  confirm: "none",
  description:
    "List the style changes the user made by hand more than once in recent manual versions, as proposed design rules. Each proposal names one CSS property or class group, the value, how many times it was set and the changed layers. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/design-rules/proposals",
  },
  id: "design-rule.inspectProposals",
  input: Schema.Struct({
    directionId: ProposalDirectionFieldSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "inspect_proposals_design_rule" },
  needs: "project.read",
  output: RuleProposalsSchema,
  scope: "project",
});

export { inspectProposalsDesignRule };

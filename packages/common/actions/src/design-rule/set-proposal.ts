import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  ProposalDirectionFieldSchema,
  ProposalIdSchema,
  ProposalStatusSchema,
  RuleProposalSetSchema,
} from "./proposal/schema.js";

const setProposalDesignRule = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_proposal_design_rule",
    set: "core",
    short:
      "Accept or dismiss one proposed design rule. Accept saves it as a project rule.",
  },
  confirm: "none",
  description:
    "Accept or dismiss one proposed design rule from inspect_proposals_design_rule. Accept saves the rule text as a project rule, as create_design_rule does, and the Review rules editor shows it. Dismiss hides the proposal for good.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/design-rules/proposals/:proposalId",
  },
  id: "design-rule.setProposal",
  input: Schema.Struct({
    directionId: ProposalDirectionFieldSchema,
    projectId: ProjectIdSchema,
    proposalId: ProposalIdSchema,
    status: ProposalStatusSchema,
  }),
  invalidates: ["design-rule.inspectProposals", "direct-edit.getRules"],
  mcp: { name: "set_proposal_design_rule" },
  needs: "project.update",
  output: RuleProposalSetSchema,
  scope: "project",
});

export { setProposalDesignRule };

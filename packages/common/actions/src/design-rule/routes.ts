// @generated
const routes = {
  createDesignRule: {
    id: "design-rule.create",
    invalidates: ["direct-edit.getRules"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-rules",
  },
  inspectProposalsDesignRule: {
    id: "design-rule.inspectProposals",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/design-rules/proposals",
  },
  setProposalDesignRule: {
    id: "design-rule.setProposal",
    invalidates: ["design-rule.inspectProposals", "direct-edit.getRules"],
    method: "POST",
    path: "/api/projects/:projectId/design-rules/proposals/:proposalId",
  },
} as const;

export { routes };

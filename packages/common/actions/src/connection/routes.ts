// @generated
const routes = {
  getSetupConnection: {
    id: "connection.getSetup",
    invalidates: [],
    method: "GET",
    path: "/api/mcp/setup",
  },
  getStatusConnection: {
    id: "connection.getStatus",
    invalidates: [],
    method: "GET",
    path: "/api/mcp",
  },
  listActivityConnection: {
    id: "connection.listActivity",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/mcp/activity",
  },
  listApprovalsConnection: {
    id: "connection.listApprovals",
    invalidates: [],
    method: "GET",
    path: "/api/mcp/approvals",
  },
  setApprovalConnection: {
    id: "connection.setApproval",
    invalidates: ["connection.listApprovals"],
    method: "POST",
    path: "/api/mcp/approvals/:approvalId",
  },
  setStatusConnection: {
    id: "connection.setStatus",
    invalidates: ["connection.getStatus", "connection.listApprovals"],
    method: "POST",
    path: "/api/mcp",
  },
} as const;

export { routes };

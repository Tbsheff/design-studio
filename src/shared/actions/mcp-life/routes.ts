// @generated
const routes = {
  answerApprovalMcpLife: {
    id: "mcp-life.answerApproval",
    invalidates: ["mcp-life.listApprovals"],
    method: "POST",
    path: "/api/mcp/approvals/:id",
  },
  getStatusMcpLife: {
    id: "mcp-life.getStatus",
    invalidates: [],
    method: "GET",
    path: "/api/mcp",
  },
  listActivityMcpLife: {
    id: "mcp-life.listActivity",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/mcp/activity",
  },
  listApprovalsMcpLife: {
    id: "mcp-life.listApprovals",
    invalidates: [],
    method: "GET",
    path: "/api/mcp/approvals",
  },
  setStatusMcpLife: {
    id: "mcp-life.setStatus",
    invalidates: ["mcp-life.getStatus", "mcp-life.listApprovals"],
    method: "POST",
    path: "/api/mcp",
  },
} as const;

export { routes };

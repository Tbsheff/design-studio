// @generated
const routes = {
  getDoctorMcpRead: {
    id: "mcp-read.getDoctor",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/app/doctor",
  },
  getPortPlanMcpRead: {
    id: "mcp-read.getPortPlan",
    invalidates: [],
    method: "GET",
    path: "/api/port/plan",
  },
  getUsageMcpRead: {
    id: "mcp-read.getUsage",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/usage",
  },
} as const;

export { routes };

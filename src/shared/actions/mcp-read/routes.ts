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
  listFoundAppsMcpRead: {
    id: "mcp-read.listFoundApps",
    invalidates: [],
    method: "GET",
    path: "/api/found-apps",
  },
  listProjectsMcpRead: {
    id: "mcp-read.listProjects",
    invalidates: [],
    method: "GET",
    path: "/api/projects-summary",
  },
  listVersionsMcpRead: {
    id: "mcp-read.listVersions",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/versions",
  },
  searchProjectsMcpRead: {
    id: "mcp-read.searchProjects",
    invalidates: [],
    method: "GET",
    path: "/api/projects-search",
  },
} as const;

export { routes };

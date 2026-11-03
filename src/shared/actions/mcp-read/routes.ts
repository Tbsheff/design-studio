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
  listFilesMcpRead: {
    id: "mcp-read.listFiles",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/source-files",
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
  listRoutesMcpRead: {
    id: "mcp-read.listRoutes",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/routes",
  },
  listVariantsMcpRead: {
    id: "mcp-read.listVariants",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/variants",
  },
  listVersionsMcpRead: {
    id: "mcp-read.listVersions",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/versions",
  },
  readFileMcpRead: {
    id: "mcp-read.readFile",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/source-file",
  },
  searchProjectsMcpRead: {
    id: "mcp-read.searchProjects",
    invalidates: [],
    method: "GET",
    path: "/api/projects-search",
  },
} as const;

export { routes };

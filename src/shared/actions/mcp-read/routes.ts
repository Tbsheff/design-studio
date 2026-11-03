// @generated
const routes = {
  getDesignMdMcpRead: {
    id: "mcp-read.getDesignMd",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/design-md",
  },
  getDoctorMcpRead: {
    id: "mcp-read.getDoctor",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/app/doctor",
  },
  getFrameHtmlMcpRead: {
    id: "mcp-read.getFrameHtml",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/frame-html",
  },
  getPortPlanMcpRead: {
    id: "mcp-read.getPortPlan",
    invalidates: [],
    method: "GET",
    path: "/api/port/plan",
  },
  getRunContextMcpRead: {
    id: "mcp-read.getRunContext",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/run-context",
  },
  getScreenshotMcpRead: {
    id: "mcp-read.getScreenshot",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/screenshot",
  },
  getTokensMcpRead: {
    id: "mcp-read.getTokens",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/design-tokens",
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

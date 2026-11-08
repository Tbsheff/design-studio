// @generated
const routes = {
  createFolderWorkspace: {
    id: "workspace.createFolder",
    invalidates: ["workspace.getFolders"],
    method: "POST",
    path: "/api/workspaces",
  },
  deleteFolderWorkspace: {
    id: "workspace.deleteFolder",
    invalidates: ["workspace.getFolders"],
    method: "DELETE",
    path: "/api/workspaces/:workspaceId",
  },
  getDesignMdWorkspace: {
    id: "workspace.getDesignMd",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/design-md",
  },
  getDoctorWorkspace: {
    id: "workspace.getDoctor",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/app/doctor",
  },
  getFileWorkspace: {
    id: "workspace.getFile",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/source-file",
  },
  getFoldersWorkspace: {
    id: "workspace.getFolders",
    invalidates: [],
    method: "GET",
    path: "/api/workspaces",
  },
  getFrameHtmlWorkspace: {
    id: "workspace.getFrameHtml",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/frame-html",
  },
  getPortPlanWorkspace: {
    id: "workspace.getPortPlan",
    invalidates: [],
    method: "GET",
    path: "/api/port/plan",
  },
  getRunContextWorkspace: {
    id: "workspace.getRunContext",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/run-context",
  },
  getScreenshotWorkspace: {
    id: "workspace.getScreenshot",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/screenshot",
  },
  getTokensWorkspace: {
    id: "workspace.getTokens",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/design-tokens",
  },
  getUsageWorkspace: {
    id: "workspace.getUsage",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/usage",
  },
  listFilesWorkspace: {
    id: "workspace.listFiles",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/source-files",
  },
  listFoundAppsWorkspace: {
    id: "workspace.listFoundApps",
    invalidates: [],
    method: "GET",
    path: "/api/found-apps",
  },
  listProjectsWorkspace: {
    id: "workspace.listProjects",
    invalidates: [],
    method: "GET",
    path: "/api/projects-summary",
  },
  listRoutesWorkspace: {
    id: "workspace.listRoutes",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/routes",
  },
  listVariantsWorkspace: {
    id: "workspace.listVariants",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/variants",
  },
  listVersionsWorkspace: {
    id: "workspace.listVersions",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/versions",
  },
  renameFolderWorkspace: {
    id: "workspace.renameFolder",
    invalidates: ["workspace.getFolders"],
    method: "PATCH",
    path: "/api/workspaces/:workspaceId",
  },
  searchProjectsWorkspace: {
    id: "workspace.searchProjects",
    invalidates: [],
    method: "GET",
    path: "/api/projects-search",
  },
  setDefaultFolderWorkspace: {
    id: "workspace.setDefaultFolder",
    invalidates: ["workspace.getFolders", "project.list"],
    method: "PUT",
    path: "/api/workspaces/default",
  },
} as const;

export { routes };

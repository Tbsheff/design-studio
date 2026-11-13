// @generated
const routes = {
  applyToken: {
    id: "token.apply",
    invalidates: ["token.listClasses", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tokens/apply",
  },
  deleteToken: {
    id: "token.delete",
    invalidates: [
      "direct-edit.getDesignSystem",
      "token.listClasses",
      "token.listUsage",
      "version.list",
    ],
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/tokens/delete",
  },
  exportToken: {
    id: "token.export",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/tokens/export",
  },
  importToken: {
    id: "token.import",
    invalidates: [
      "token.listUsage",
      "direct-edit.getDesignSystem",
      "version.list",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tokens/import",
  },
  listClassesToken: {
    id: "token.listClasses",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/tokens/classes",
  },
  listUsageToken: {
    id: "token.listUsage",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/tokens/usage",
  },
  renameToken: {
    id: "token.rename",
    invalidates: [
      "direct-edit.getDesignSystem",
      "token.listClasses",
      "token.listUsage",
      "version.list",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tokens/rename",
  },
  setToken: {
    id: "token.set",
    invalidates: [
      "direct-edit.getDesignSystem",
      "token.listClasses",
      "version.list",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tokens/set",
  },
} as const;

export { routes };

// @generated
const routes = {
  applyToken: {
    id: "token.apply",
    invalidates: ["version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tokens/apply",
  },
  exportToken: {
    id: "token.export",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/tokens/export",
  },
  listUsageToken: {
    id: "token.listUsage",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/tokens/usage",
  },
  setToken: {
    id: "token.set",
    invalidates: ["direct-edit.getDesignSystem", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tokens/set",
  },
} as const;

export { routes };

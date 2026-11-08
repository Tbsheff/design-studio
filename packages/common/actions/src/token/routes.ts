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
  setToken: {
    id: "token.set",
    invalidates: ["direct-edit.getDesignSystem", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tokens/set",
  },
} as const;

export { routes };

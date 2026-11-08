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
} as const;

export { routes };

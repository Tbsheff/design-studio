// @generated
const routes = {
  applyToken: {
    id: "token.apply",
    invalidates: ["version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/tokens/apply",
  },
} as const;

export { routes };

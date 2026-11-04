// @generated
const routes = {
  applyContent: {
    id: "content.apply",
    invalidates: ["version.list", "version.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/content",
  },
} as const;

export { routes };

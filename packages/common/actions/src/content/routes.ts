// @generated
const routes = {
  applyContent: {
    id: "content.apply",
    invalidates: ["version.list", "version.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/content",
  },
  importContent: {
    id: "content.import",
    invalidates: ["version.list", "version.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/content/import",
  },
} as const;

export { routes };

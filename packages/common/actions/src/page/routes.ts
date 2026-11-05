// @generated
const routes = {
  importPage: {
    id: "page.import",
    invalidates: ["canvas.getDoc"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/import-page",
  },
} as const;

export { routes };

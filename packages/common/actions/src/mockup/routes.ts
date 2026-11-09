// @generated
const routes = {
  exportMockup: {
    id: "mockup.export",
    invalidates: ["export.getHandoff"],
    method: "POST",
    path: "/api/projects/:projectId/mockup/export",
  },
} as const;

export { routes };

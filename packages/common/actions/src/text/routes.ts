// @generated
const routes = {
  inspectText: {
    id: "text.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/search-text",
  },
  updateText: {
    id: "text.update",
    invalidates: ["text.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/update-text",
  },
} as const;

export { routes };

// @generated
const routes = {
  getSpacing: {
    id: "spacing.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/spacing",
  },
  setSpacing: {
    id: "spacing.set",
    invalidates: ["spacing.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/spacing",
  },
} as const;

export { routes };

// @generated
const routes = {
  getDividerSpacing: {
    id: "spacing.getDivider",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/spacing/divider",
  },
  getSpacing: {
    id: "spacing.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/spacing",
  },
  setDividerSpacing: {
    id: "spacing.setDivider",
    invalidates: ["spacing.getDivider"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/spacing/divider",
  },
  setSpacing: {
    id: "spacing.set",
    invalidates: ["spacing.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/spacing",
  },
} as const;

export { routes };

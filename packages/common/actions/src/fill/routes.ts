// @generated
const routes = {
  getFill: {
    id: "fill.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/fill",
  },
  setFill: {
    id: "fill.set",
    invalidates: ["fill.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/fill",
  },
} as const;

export { routes };

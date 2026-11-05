// @generated
const routes = {
  getStacking: {
    id: "stacking.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/stacking",
  },
  setStacking: {
    id: "stacking.set",
    invalidates: ["stacking.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/stacking",
  },
} as const;

export { routes };

// @generated
const routes = {
  inspectStateStyle: {
    id: "state-style.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/state-styles",
  },
  setForcedStateStyle: {
    id: "state-style.setForced",
    invalidates: ["state-style.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/state-styles/forced",
  },
  setStateStyle: {
    id: "state-style.set",
    invalidates: ["state-style.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/state-styles",
  },
} as const;

export { routes };

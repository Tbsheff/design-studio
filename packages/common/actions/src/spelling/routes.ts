// @generated
const routes = {
  inspectSpelling: {
    id: "spelling.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/spelling",
  },
  setSpelling: {
    id: "spelling.set",
    invalidates: ["spelling.inspect"],
    method: "PUT",
    path: "/api/projects/:projectId/spelling",
  },
} as const;

export { routes };

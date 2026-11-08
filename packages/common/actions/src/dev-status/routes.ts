// @generated
const routes = {
  listDevStatus: {
    id: "dev-status.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/dev-status",
  },
  setDevStatus: {
    id: "dev-status.set",
    invalidates: ["dev-status.list"],
    method: "POST",
    path: "/api/projects/:projectId/dev-status",
  },
} as const;

export { routes };

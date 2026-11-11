// @generated
const routes = {
  importReference: {
    id: "reference.import",
    invalidates: ["project.get"],
    method: "POST",
    path: "/api/projects/:projectId/references",
  },
  listReference: {
    id: "reference.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/references/pins",
  },
  setReference: {
    id: "reference.set",
    invalidates: ["reference.list", "run.getContext"],
    method: "PUT",
    path: "/api/projects/:projectId/references/pins/:frameId",
  },
} as const;

export { routes };

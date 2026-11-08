// @generated
const routes = {
  createCompletion: {
    id: "completion.create",
    invalidates: ["completion.list"],
    method: "POST",
    path: "/api/projects/:projectId/completions",
  },
  listCompletion: {
    id: "completion.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/completions",
  },
  setCompletion: {
    id: "completion.set",
    invalidates: ["completion.list"],
    method: "PUT",
    path: "/api/projects/:projectId/completions/settings",
  },
} as const;

export { routes };

// @generated
const routes = {
  list: {
    id: "publish.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/publications",
  },
  unpublish: {
    id: "publish.unpublish",
    invalidates: ["publish.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/publications/:publicationId",
  },
} as const;

export { routes };

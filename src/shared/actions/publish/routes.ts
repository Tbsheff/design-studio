// @generated
const routes = {
  getPublish: {
    id: "publish.get",
    invalidates: [],
    method: "GET",
    path: "/api/publish/cli",
  },
  inspectPublish: {
    id: "publish.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/publish/backend",
  },
  listCommentsPublish: {
    id: "publish.listComments",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/publications/:publicationId/comments",
  },
  listPublish: {
    id: "publish.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/publications",
  },
} as const;

export { routes };

// @generated
const routes = {
  deleteCommentPublish: {
    id: "publish.deleteComment",
    invalidates: ["publish.listComments", "publish.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/publications/:publicationId/comments/:commentId",
  },
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
  publishPublish: {
    id: "publish.publish",
    invalidates: ["publish.list"],
    method: "POST",
    path: "/api/projects/:projectId/publish",
  },
  restorePublish: {
    id: "publish.restore",
    invalidates: ["publish.list"],
    method: "POST",
    path: "/api/projects/:projectId/publications/:publicationId/rollback",
  },
  unpublishPublish: {
    id: "publish.unpublish",
    invalidates: ["publish.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/publications/:publicationId",
  },
} as const;

export { routes };

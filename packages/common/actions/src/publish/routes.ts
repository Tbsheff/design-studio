// @generated
const routes = {
  applyPublish: {
    id: "publish.apply",
    invalidates: ["publish.inspect"],
    method: "POST",
    path: "/api/publish/backend/setup",
  },
  deleteCommentPublish: {
    id: "publish.deleteComment",
    invalidates: ["publish.listComments", "publish.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/publications/:publicationId/comments/:commentId",
  },
  deletePublish: {
    id: "publish.delete",
    invalidates: ["publish.get"],
    method: "POST",
    path: "/api/publish/logout",
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
  setPublish: {
    id: "publish.set",
    invalidates: ["publish.get", "publish.inspect"],
    method: "PUT",
    path: "/api/publish/settings",
  },
  startPublish: {
    id: "publish.start",
    invalidates: ["publish.get"],
    method: "POST",
    path: "/api/publish/login",
  },
  stopPublish: {
    id: "publish.stop",
    invalidates: ["publish.get"],
    method: "DELETE",
    path: "/api/publish/login",
  },
  unpublishPublish: {
    id: "publish.unpublish",
    invalidates: ["publish.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/publications/:publicationId",
  },
} as const;

export { routes };

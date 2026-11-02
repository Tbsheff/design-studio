// @generated
const routes = {
  createComments: {
    id: "comments.create",
    invalidates: ["comments.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments",
  },
  createReplyComments: {
    id: "comments.createReply",
    invalidates: ["comments.list"],
    method: "POST",
    path: "/api/projects/:projectId/comments/:commentId/replies",
  },
  deleteComments: {
    id: "comments.delete",
    invalidates: ["comments.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/comments/:commentId",
  },
  deleteReplyComments: {
    id: "comments.deleteReply",
    invalidates: ["comments.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/comments/:commentId/replies/:replyId",
  },
  exportComments: {
    id: "comments.export",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments/prefill",
  },
  insertComments: {
    id: "comments.insert",
    invalidates: ["comments.list"],
    method: "POST",
    path: "/api/projects/:projectId/comments",
  },
  listComments: {
    id: "comments.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/comments",
  },
  moveComments: {
    id: "comments.move",
    invalidates: ["comments.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments/reorder",
  },
  searchMentionComments: {
    id: "comments.searchMention",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/mention-files",
  },
  setResolvedComments: {
    id: "comments.setResolved",
    invalidates: ["comments.list"],
    method: "PUT",
    path: "/api/projects/:projectId/comments/:commentId/resolved",
  },
  startComments: {
    id: "comments.start",
    invalidates: ["comments.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments/send",
  },
  updateComments: {
    id: "comments.update",
    invalidates: ["comments.list"],
    method: "PATCH",
    path: "/api/projects/:projectId/d/:directionId/comments/:commentId",
  },
} as const;

export { routes };

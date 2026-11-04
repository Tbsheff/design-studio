// @generated
const routes = {
  createComment: {
    id: "comment.create",
    invalidates: ["comment.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments",
  },
  createReplyComment: {
    id: "comment.createReply",
    invalidates: ["comment.list"],
    method: "POST",
    path: "/api/projects/:projectId/comments/:commentId/replies",
  },
  deleteComment: {
    id: "comment.delete",
    invalidates: ["comment.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/comments/:commentId",
  },
  deleteReplyComment: {
    id: "comment.deleteReply",
    invalidates: ["comment.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/comments/:commentId/replies/:replyId",
  },
  exportComment: {
    id: "comment.export",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments/prefill",
  },
  insertComment: {
    id: "comment.insert",
    invalidates: ["comment.list"],
    method: "POST",
    path: "/api/projects/:projectId/comments",
  },
  listComment: {
    id: "comment.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/comments",
  },
  moveComment: {
    id: "comment.move",
    invalidates: ["comment.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments/reorder",
  },
  searchMentionComment: {
    id: "comment.searchMention",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/mention-files",
  },
  setResolvedComment: {
    id: "comment.setResolved",
    invalidates: ["comment.list"],
    method: "PUT",
    path: "/api/projects/:projectId/comments/:commentId/resolved",
  },
  startComment: {
    id: "comment.start",
    invalidates: ["comment.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/comments/send",
  },
  updateComment: {
    id: "comment.update",
    invalidates: ["comment.list"],
    method: "PATCH",
    path: "/api/projects/:projectId/d/:directionId/comments/:commentId",
  },
} as const;

export { routes };

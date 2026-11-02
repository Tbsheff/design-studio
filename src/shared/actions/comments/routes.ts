// @generated
const routes = {
  listComments: {
    id: "comments.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/comments",
  },
  searchMentionComments: {
    id: "comments.searchMention",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/mention-files",
  },
} as const;

export { routes };

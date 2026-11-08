// @generated
const routes = {
  createDevNote: {
    id: "dev-note.create",
    invalidates: ["dev-note.list"],
    method: "POST",
    path: "/api/projects/:projectId/dev-notes",
  },
  deleteDevNote: {
    id: "dev-note.delete",
    invalidates: ["dev-note.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/dev-notes/:noteId",
  },
  listDevNote: {
    id: "dev-note.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/dev-notes",
  },
  updateDevNote: {
    id: "dev-note.update",
    invalidates: ["dev-note.list"],
    method: "PATCH",
    path: "/api/projects/:projectId/dev-notes/:noteId",
  },
} as const;

export { routes };

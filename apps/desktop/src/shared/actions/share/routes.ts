// @generated
const routes = {
  createShare: {
    id: "share.create",
    invalidates: ["share.list"],
    method: "POST",
    path: "/api/projects/:projectId/shares",
  },
  deleteShare: {
    id: "share.delete",
    invalidates: ["share.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/shares/:shareId",
  },
  listShare: {
    id: "share.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/shares",
  },
  setCursorShare: {
    id: "share.setCursor",
    invalidates: [],
    method: "PUT",
    path: "/api/projects/:projectId/share-cursor",
  },
  setLanShare: {
    id: "share.setLan",
    invalidates: ["share.list"],
    method: "PUT",
    path: "/api/shares/lan",
  },
  updateShare: {
    id: "share.update",
    invalidates: ["share.list"],
    method: "PUT",
    path: "/api/projects/:projectId/shares/:shareId",
  },
} as const;

export { routes };

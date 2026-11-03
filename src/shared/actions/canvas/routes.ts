// @generated
const routes = {
  createLinkCanvas: {
    id: "canvas.createLink",
    invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
    method: "POST",
    path: "/api/projects/:projectId/links",
  },
  deleteLinkCanvas: {
    id: "canvas.deleteLink",
    invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
    method: "DELETE",
    path: "/api/projects/:projectId/links/:linkId",
  },
  keepLinkCanvas: {
    id: "canvas.keepLink",
    invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
    method: "POST",
    path: "/api/projects/:projectId/links/keep",
  },
  listImplicitLinksCanvas: {
    id: "canvas.listImplicitLinks",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/links/implicit",
  },
  listLinksCanvas: {
    id: "canvas.listLinks",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/links",
  },
  setStartLinkCanvas: {
    id: "canvas.setStartLink",
    invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
    method: "PUT",
    path: "/api/projects/:projectId/links/start",
  },
  updateLinkCanvas: {
    id: "canvas.updateLink",
    invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
    method: "PATCH",
    path: "/api/projects/:projectId/links/:linkId",
  },
} as const;

export { routes };

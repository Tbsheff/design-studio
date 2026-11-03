// @generated
const routes = {
  createFlowCanvas: {
    id: "canvas.createFlow",
    invalidates: ["canvas.getDoc", "canvas.listFlowParams", "canvas.listLinks"],
    method: "POST",
    path: "/api/projects/:projectId/flow",
  },
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
  getDocCanvas: {
    id: "canvas.getDoc",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/canvas",
  },
  importLinkCanvas: {
    id: "canvas.importLink",
    invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
    method: "POST",
    path: "/api/projects/:projectId/links/keep",
  },
  listFlowLinksCanvas: {
    id: "canvas.listFlowLinks",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/flow/links",
  },
  listFlowParamsCanvas: {
    id: "canvas.listFlowParams",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/flow/params",
  },
  listFrameStatesCanvas: {
    id: "canvas.listFrameStates",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/frame-states",
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
  setDocCanvas: {
    id: "canvas.setDoc",
    invalidates: ["canvas.getDoc"],
    method: "PUT",
    path: "/api/projects/:projectId/canvas",
  },
  setFrameStateCanvas: {
    id: "canvas.setFrameState",
    invalidates: ["canvas.listFrameStates"],
    method: "PUT",
    path: "/api/projects/:projectId/frame-states/frames/:frame",
  },
  setPresenceCanvas: {
    id: "canvas.setPresence",
    invalidates: [],
    method: "PUT",
    path: "/api/projects/:projectId/canvas/presence",
  },
  setStartLinkCanvas: {
    id: "canvas.setStartLink",
    invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
    method: "PUT",
    path: "/api/projects/:projectId/links/start",
  },
  updateFrameSessionCanvas: {
    id: "canvas.updateFrameSession",
    invalidates: ["canvas.listFrameStates"],
    method: "PATCH",
    path: "/api/projects/:projectId/frame-states/session",
  },
  updateLinkCanvas: {
    id: "canvas.updateLink",
    invalidates: ["canvas.listImplicitLinks", "canvas.listLinks"],
    method: "PATCH",
    path: "/api/projects/:projectId/links/:linkId",
  },
} as const;

export { routes };

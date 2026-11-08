// @generated
const routes = {
  applyViewport: {
    id: "viewport.apply",
    invalidates: ["direct-edit.getTree", "workspace.getFrameHtml"],
    method: "POST",
    path: "/api/projects/:projectId/viewport/apply",
  },
  createViewport: {
    id: "viewport.create",
    invalidates: ["canvas.getDoc"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/viewport-matrix",
  },
  runViewport: {
    id: "viewport.run",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/viewport-matrix/run",
  },
} as const;

export { routes };

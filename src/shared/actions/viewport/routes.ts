// @generated
const routes = {
  createViewport: {
    id: "viewport.create",
    invalidates: ["canvas.getDoc"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/viewport-matrix",
  },
  inspectViewport: {
    id: "viewport.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/viewport-matrix",
  },
} as const;

export { routes };

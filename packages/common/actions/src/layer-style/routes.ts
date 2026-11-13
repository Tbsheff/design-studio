// @generated
const routes = {
  applyLayerStyle: {
    id: "layer-style.apply",
    invalidates: ["layer-style.get", "direct-edit.getTree"],
    method: "POST",
    path: "/api/projects/:projectId/layer-style/apply",
  },
  getLayerStyle: {
    id: "layer-style.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/layer-style",
  },
  updateLayerStyle: {
    id: "layer-style.update",
    invalidates: ["layer-style.get", "version.list", "canvas.getDoc"],
    method: "POST",
    path: "/api/projects/:projectId/layer-style/update",
  },
} as const;

export { routes };

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
} as const;

export { routes };

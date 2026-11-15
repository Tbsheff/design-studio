// @generated
const routes = {
  renameLayer: {
    id: "layer.rename",
    invalidates: ["direct-edit.getTree", "version.list", "version.listHistory"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/layers/rename",
  },
} as const;

export { routes };

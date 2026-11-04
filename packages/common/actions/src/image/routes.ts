// @generated
const routes = {
  createImage: {
    id: "image.create",
    invalidates: [
      "canvas.getDoc",
      "direct-edit.getTree",
      "version.list",
      "version.listHistory",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/images",
  },
  inspectImage: {
    id: "image.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/image-generate",
  },
} as const;

export { routes };

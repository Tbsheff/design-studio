// @generated
const routes = {
  createImage: {
    id: "image.create",
    invalidates: ["image.inspect"],
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

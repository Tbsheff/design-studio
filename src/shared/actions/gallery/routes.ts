// @generated
const routes = {
  createGallery: {
    id: "gallery.create",
    invalidates: ["canvas.getDoc", "gallery.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/component-gallery",
  },
  inspectGallery: {
    id: "gallery.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/component-gallery",
  },
} as const;

export { routes };

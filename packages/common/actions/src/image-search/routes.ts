// @generated
const routes = {
  applyImageSearch: {
    id: "image-search.apply",
    invalidates: ["version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/image-search/apply",
  },
  getImageSearch: {
    id: "image-search.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/image-search",
  },
  insertImageSearch: {
    id: "image-search.insert",
    invalidates: ["version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/image-search/place",
  },
  inspectImageSearch: {
    id: "image-search.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/image-search/photos",
  },
} as const;

export { routes };

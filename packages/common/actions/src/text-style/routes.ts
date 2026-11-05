// @generated
const routes = {
  applyTextStyle: {
    id: "text-style.apply",
    invalidates: ["text-style.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/text-styles/apply",
  },
  createTextStyle: {
    id: "text-style.create",
    invalidates: ["text-style.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/text-styles/create",
  },
  inspectTextStyle: {
    id: "text-style.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/text-styles",
  },
  updateTextStyle: {
    id: "text-style.update",
    invalidates: ["text-style.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/text-styles/detach",
  },
} as const;

export { routes };

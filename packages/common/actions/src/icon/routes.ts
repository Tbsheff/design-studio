// @generated
const routes = {
  insertIcon: {
    id: "icon.insert",
    invalidates: ["icon.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/icons/insert",
  },
  inspectIcon: {
    id: "icon.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/icons",
  },
} as const;

export { routes };

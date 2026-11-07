// @generated
const routes = {
  applyTheme: {
    id: "theme.apply",
    invalidates: ["theme.list", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/themes/apply",
  },
  createTheme: {
    id: "theme.create",
    invalidates: ["theme.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/themes",
  },
  listTheme: {
    id: "theme.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/themes",
  },
  setTheme: {
    id: "theme.set",
    invalidates: ["theme.list"],
    method: "PUT",
    path: "/api/projects/:projectId/d/:directionId/themes/live",
  },
} as const;

export { routes };

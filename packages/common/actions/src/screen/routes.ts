// @generated
const routes = {
  createScreen: {
    id: "screen.create",
    invalidates: ["canvas.getDoc", "version.list", "workspace.listRoutes"],
    method: "POST",
    path: "/api/projects/:projectId/screens",
  },
  duplicateScreen: {
    id: "screen.duplicate",
    invalidates: ["canvas.getDoc", "version.list", "workspace.listRoutes"],
    method: "POST",
    path: "/api/projects/:projectId/screens/duplicates",
  },
  inspectScreen: {
    id: "screen.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/screens/plan",
  },
} as const;

export { routes };

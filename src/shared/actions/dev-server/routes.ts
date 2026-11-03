// @generated
const routes = {
  createDevServer: {
    id: "dev-server.create",
    invalidates: ["dev-server.get"],
    method: "POST",
    path: "/api/projects/attach",
  },
  getDevServer: {
    id: "dev-server.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/app",
  },
  listRoutesDevServer: {
    id: "dev-server.listRoutes",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/app/routes",
  },
  runDevServer: {
    id: "dev-server.run",
    invalidates: ["dev-server.get"],
    method: "POST",
    path: "/api/projects/:projectId/app/restart",
  },
  setDevServer: {
    id: "dev-server.set",
    invalidates: ["dev-server.get"],
    method: "POST",
    path: "/api/projects/:projectId/app/config",
  },
  startDevServer: {
    id: "dev-server.start",
    invalidates: ["dev-server.get"],
    method: "POST",
    path: "/api/projects/:projectId/app/start",
  },
  stopDevServer: {
    id: "dev-server.stop",
    invalidates: ["dev-server.get"],
    method: "POST",
    path: "/api/projects/:projectId/app/stop",
  },
} as const;

export { routes };

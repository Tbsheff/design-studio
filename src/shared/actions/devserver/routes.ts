// @generated
const routes = {
  createDevserver: {
    id: "devserver.create",
    invalidates: ["devserver.get"],
    method: "POST",
    path: "/api/projects/attach",
  },
  getDevserver: {
    id: "devserver.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/app",
  },
  listDevserver: {
    id: "devserver.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/app/routes",
  },
  runDevserver: {
    id: "devserver.run",
    invalidates: ["devserver.get"],
    method: "POST",
    path: "/api/projects/:projectId/app/restart",
  },
  setDevserver: {
    id: "devserver.set",
    invalidates: ["devserver.get"],
    method: "POST",
    path: "/api/projects/:projectId/app/config",
  },
  startDevserver: {
    id: "devserver.start",
    invalidates: ["devserver.get"],
    method: "POST",
    path: "/api/projects/:projectId/app/start",
  },
  stopDevserver: {
    id: "devserver.stop",
    invalidates: ["devserver.get"],
    method: "POST",
    path: "/api/projects/:projectId/app/stop",
  },
} as const;

export { routes };

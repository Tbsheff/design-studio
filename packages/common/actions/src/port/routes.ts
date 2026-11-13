// @generated
const routes = {
  inspectPort: {
    id: "port.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/port/match",
  },
  startPort: {
    id: "port.start",
    invalidates: ["run.list"],
    method: "POST",
    path: "/api/port/start",
  },
} as const;

export { routes };

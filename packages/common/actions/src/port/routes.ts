// @generated
const routes = {
  applyPort: {
    id: "port.apply",
    invalidates: ["port.inspect"],
    method: "POST",
    path: "/api/projects/:projectId/port/apply",
  },
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

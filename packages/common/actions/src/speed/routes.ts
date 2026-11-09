// @generated
const routes = {
  getSpeed: {
    id: "speed.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/speed",
  },
  runSpeed: {
    id: "speed.run",
    invalidates: ["speed.get"],
    method: "POST",
    path: "/api/projects/:projectId/speed/run",
  },
} as const;

export { routes };

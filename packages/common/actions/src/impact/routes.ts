// @generated
const routes = {
  getImpact: {
    id: "impact.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/impact",
  },
  runImpact: {
    id: "impact.run",
    invalidates: ["impact.get"],
    method: "POST",
    path: "/api/projects/:projectId/impact/run",
  },
} as const;

export { routes };

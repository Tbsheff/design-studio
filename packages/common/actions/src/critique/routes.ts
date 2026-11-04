// @generated
const routes = {
  getCritique: {
    id: "critique.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/critique/:frameId",
  },
  runCritique: {
    id: "critique.run",
    invalidates: ["critique.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/critique/:frameId/run",
  },
} as const;

export { routes };

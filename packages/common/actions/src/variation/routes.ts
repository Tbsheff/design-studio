// @generated
const routes = {
  startVariation: {
    id: "variation.start",
    invalidates: ["project.get", "run.list"],
    method: "POST",
    path: "/api/projects/:projectId/variations/start",
  },
} as const;

export { routes };

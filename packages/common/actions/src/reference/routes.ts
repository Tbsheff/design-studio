// @generated
const routes = {
  importReference: {
    id: "reference.import",
    invalidates: ["project.get"],
    method: "POST",
    path: "/api/projects/:projectId/references",
  },
} as const;

export { routes };

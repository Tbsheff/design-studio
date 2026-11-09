// @generated
const routes = {
  importComponent: {
    id: "component.import",
    invalidates: ["block.list", "workspace.listFiles", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/components/import",
  },
} as const;

export { routes };

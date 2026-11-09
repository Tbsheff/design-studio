// @generated
const routes = {
  importComponent: {
    id: "component.import",
    invalidates: ["block.list", "workspace.listFiles", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/components/import",
  },
  listUsageComponent: {
    id: "component.listUsage",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/components/usage",
  },
} as const;

export { routes };

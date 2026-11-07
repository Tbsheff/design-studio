// @generated
const routes = {
  createIntegration: {
    id: "integration.create",
    invalidates: ["integration.list"],
    method: "POST",
    path: "/api/integration",
  },
  deleteIntegration: {
    id: "integration.delete",
    invalidates: ["integration.list"],
    method: "DELETE",
    path: "/api/integration/:integrationId",
  },
  listIntegration: {
    id: "integration.list",
    invalidates: [],
    method: "GET",
    path: "/api/integration",
  },
  runIntegration: {
    id: "integration.run",
    invalidates: ["integration.list"],
    method: "POST",
    path: "/api/integration/:integrationId/run",
  },
  updateIntegration: {
    id: "integration.update",
    invalidates: ["integration.list"],
    method: "PATCH",
    path: "/api/integration/:integrationId",
  },
} as const;

export { routes };

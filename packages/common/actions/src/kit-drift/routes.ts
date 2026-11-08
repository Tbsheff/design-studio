// @generated
const routes = {
  applyKitDrift: {
    id: "kit-drift.apply",
    invalidates: ["kit-drift.list", "direct-edit.getTree", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/kit-drift/apply",
  },
  listKitDrift: {
    id: "kit-drift.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/kit-drift",
  },
} as const;

export { routes };

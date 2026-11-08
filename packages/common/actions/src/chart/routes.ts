// @generated
const routes = {
  insertChart: {
    id: "chart.insert",
    invalidates: ["direct-edit.getTree", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/chart",
  },
  inspectChart: {
    id: "chart.inspect",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/chart",
  },
} as const;

export { routes };

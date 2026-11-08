// @generated
const routes = {
  getDataModel: {
    id: "data-model.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/data-models/:model",
  },
  listDataModel: {
    id: "data-model.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/data-models",
  },
} as const;

export { routes };

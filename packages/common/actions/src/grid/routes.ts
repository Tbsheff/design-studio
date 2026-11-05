// @generated
const routes = {
  getGrid: {
    id: "grid.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/grid",
  },
  setGrid: {
    id: "grid.set",
    invalidates: ["grid.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/grid",
  },
  setGridItemGrid: {
    id: "grid.setGridItem",
    invalidates: ["grid.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/grid/item",
  },
} as const;

export { routes };

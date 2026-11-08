// @generated
const routes = {
  insertBlock: {
    id: "block.insert",
    invalidates: ["canvas.getDoc", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/blocks/insert",
  },
  listBlock: {
    id: "block.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/blocks",
  },
} as const;

export { routes };

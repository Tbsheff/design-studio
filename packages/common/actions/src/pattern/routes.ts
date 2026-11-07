// @generated
const routes = {
  createPattern: {
    id: "pattern.create",
    invalidates: ["pattern.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/pattern",
  },
  deletePattern: {
    id: "pattern.delete",
    invalidates: ["pattern.list", "pattern.get"],
    method: "DELETE",
    path: "/api/pattern/:patternId",
  },
  getPattern: {
    id: "pattern.get",
    invalidates: [],
    method: "GET",
    path: "/api/pattern/:patternId",
  },
  insertPattern: {
    id: "pattern.insert",
    invalidates: ["direct-edit.getTree", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/pattern/insert",
  },
  listPattern: {
    id: "pattern.list",
    invalidates: [],
    method: "GET",
    path: "/api/pattern",
  },
} as const;

export { routes };

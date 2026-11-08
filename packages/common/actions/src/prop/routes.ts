// @generated
const routes = {
  createProp: {
    id: "prop.create",
    invalidates: ["prop.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/prop",
  },
  deleteProp: {
    id: "prop.delete",
    invalidates: ["prop.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/prop",
  },
  listProp: {
    id: "prop.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/prop",
  },
  renameProp: {
    id: "prop.rename",
    invalidates: ["prop.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/prop/rename",
  },
  setProp: {
    id: "prop.set",
    invalidates: ["version.list", "version.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/props",
  },
} as const;

export { routes };

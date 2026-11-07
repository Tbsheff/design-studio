// @generated
const routes = {
  createEffect: {
    id: "effect.create",
    invalidates: ["effect.get", "effect.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/effect-style",
  },
  deleteEffect: {
    id: "effect.delete",
    invalidates: ["effect.get", "effect.list"],
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/effect-style/:name",
  },
  getEffect: {
    id: "effect.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/effect",
  },
  listEffect: {
    id: "effect.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/effect-style",
  },
  setEffect: {
    id: "effect.set",
    invalidates: ["effect.get", "effect.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/effect",
  },
} as const;

export { routes };

// @generated
const routes = {
  createComponentVariant: {
    id: "component-variant.create",
    invalidates: ["version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/component-variant/create",
  },
  getComponentVariant: {
    id: "component-variant.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/component-variant/preview",
  },
  updateComponentVariant: {
    id: "component-variant.update",
    invalidates: ["version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/component-variant/update",
  },
} as const;

export { routes };

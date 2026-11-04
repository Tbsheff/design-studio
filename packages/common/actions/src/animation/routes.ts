// @generated
const routes = {
  createAnimation: {
    id: "animation.create",
    invalidates: ["animation.list", "animation.get"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/animation",
  },
  deleteAnimation: {
    id: "animation.delete",
    invalidates: ["animation.list", "animation.get"],
    method: "DELETE",
    path: "/api/projects/:projectId/d/:directionId/animation/:animationId",
  },
  exportAnimation: {
    id: "animation.export",
    invalidates: ["animation.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/animation/:animationId/export",
  },
  getAnimation: {
    id: "animation.get",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/animation/:animationId",
  },
  listAnimation: {
    id: "animation.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/animation",
  },
  updateAnimation: {
    id: "animation.update",
    invalidates: ["animation.list", "animation.get"],
    method: "PUT",
    path: "/api/projects/:projectId/d/:directionId/animation/:animationId",
  },
} as const;

export { routes };

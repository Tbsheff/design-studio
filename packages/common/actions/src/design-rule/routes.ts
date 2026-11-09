// @generated
const routes = {
  createDesignRule: {
    id: "design-rule.create",
    invalidates: ["direct-edit.getRules"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-rules",
  },
} as const;

export { routes };

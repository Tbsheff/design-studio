// @generated
const routes = {
  createMarkup: {
    id: "markup.create",
    invalidates: ["project.get"],
    method: "POST",
    path: "/api/projects/:projectId/markups",
  },
} as const;

export { routes };

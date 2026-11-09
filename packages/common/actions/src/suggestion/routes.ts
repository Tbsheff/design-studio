// @generated
const routes = {
  runSuggestion: {
    id: "suggestion.run",
    invalidates: ["suggestion.run"],
    method: "POST",
    path: "/api/projects/:projectId/suggestions",
  },
} as const;

export { routes };

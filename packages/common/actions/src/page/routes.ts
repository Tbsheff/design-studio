// @generated
const routes = {
  importPage: {
    id: "page.import",
    invalidates: ["canvas.getDoc"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/import-page",
  },
  inspectMatchesPage: {
    id: "page.inspectMatches",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/pages/matches",
  },
  updateMatchesPage: {
    id: "page.updateMatches",
    invalidates: ["page.inspectMatches", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/pages/matches",
  },
} as const;

export { routes };

// @generated
const routes = {
  importPage: {
    id: "page.import",
    invalidates: ["canvas.getDoc"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/import-page",
  },
  importSourcePage: {
    id: "page.importSource",
    invalidates: ["canvas.getDoc", "version.list", "page.inspectSource"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/pages/source",
  },
  inspectFlowPage: {
    id: "page.inspectFlow",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/pages/flow",
  },
  inspectMatchesPage: {
    id: "page.inspectMatches",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/pages/matches",
  },
  inspectSourceChangesPage: {
    id: "page.inspectSourceChanges",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/pages/source/changes",
  },
  inspectSourcePage: {
    id: "page.inspectSource",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/pages/source",
  },
  setSourcePage: {
    id: "page.setSource",
    invalidates: ["page.inspectSource", "page.inspectSourceChanges"],
    method: "PUT",
    path: "/api/projects/:projectId/d/:directionId/pages/source",
  },
  updateMatchesPage: {
    id: "page.updateMatches",
    invalidates: ["page.inspectMatches", "version.list"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/pages/matches",
  },
} as const;

export { routes };

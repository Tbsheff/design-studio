// @generated
const routes = {
  createFixture: {
    id: "fixture.create",
    invalidates: ["fixture.list", "canvas.getDoc"],
    method: "POST",
    path: "/api/projects/:projectId/fixtures",
  },
  deleteFixture: {
    id: "fixture.delete",
    invalidates: ["fixture.list", "canvas.getDoc"],
    method: "DELETE",
    path: "/api/projects/:projectId/fixtures/:fixtureId",
  },
  listFixture: {
    id: "fixture.list",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/fixtures",
  },
} as const;

export { routes };

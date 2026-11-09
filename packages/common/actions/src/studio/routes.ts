// @generated
const routes = {
  getActivityStudio: {
    id: "studio.getActivity",
    invalidates: [],
    method: "GET",
    path: "/api/activity",
  },
  healthStudio: {
    id: "studio.health",
    invalidates: [],
    method: "GET",
    path: "/api/health",
  },
  listSkillsStudio: {
    id: "studio.listSkills",
    invalidates: [],
    method: "GET",
    path: "/api/skills",
  },
} as const;

export { routes };

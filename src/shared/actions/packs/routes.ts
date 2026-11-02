// @generated
const routes = {
  getDraftPacks: {
    id: "packs.getDraft",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/design-system-draft",
  },
  getPackPacks: {
    id: "packs.getPack",
    invalidates: [],
    method: "GET",
    path: "/api/packs/:packId/detail",
  },
  inspectDraftPacks: {
    id: "packs.inspectDraft",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/design-system-draft/status",
  },
  inspectPackPacks: {
    id: "packs.inspectPack",
    invalidates: [],
    method: "GET",
    path: "/api/packs/:packId/check",
  },
  listPacks: {
    id: "packs.list",
    invalidates: [],
    method: "GET",
    path: "/api/design-systems",
  },
} as const;

export { routes };

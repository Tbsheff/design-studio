// @generated
const routes = {
  applyPackPacks: {
    id: "packs.applyPack",
    invalidates: ["packs.getDraft", "packs.inspectDraft"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-system/apply",
  },
  createDraftPacks: {
    id: "packs.createDraft",
    invalidates: ["packs.listSummary", "packs.list", "packs.getPack"],
    method: "POST",
    path: "/api/design-systems/draft",
  },
  createPackPacks: {
    id: "packs.createPack",
    invalidates: ["packs.listSummary", "packs.list", "packs.getPack"],
    method: "POST",
    path: "/api/packs",
  },
  deletePackPacks: {
    id: "packs.deletePack",
    invalidates: ["packs.listSummary", "packs.list", "packs.getPack"],
    method: "DELETE",
    path: "/api/packs/:packId",
  },
  duplicatePackPacks: {
    id: "packs.duplicatePack",
    invalidates: ["packs.listSummary", "packs.list", "packs.getPack"],
    method: "POST",
    path: "/api/packs/:packId/duplicate",
  },
  exportPackPacks: {
    id: "packs.exportPack",
    invalidates: [],
    method: "GET",
    path: "/api/packs/:packId/export",
  },
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
  importPackPacks: {
    id: "packs.importPack",
    invalidates: ["packs.listSummary", "packs.list", "packs.getPack"],
    method: "POST",
    path: "/api/packs/import",
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
  listProblemPacks: {
    id: "packs.listProblem",
    invalidates: [],
    method: "GET",
    path: "/api/packs/problems",
  },
  listSummaryPacks: {
    id: "packs.listSummary",
    invalidates: [],
    method: "GET",
    path: "/api/packs",
  },
  publishDraftPacks: {
    id: "packs.publishDraft",
    invalidates: [
      "packs.listSummary",
      "packs.list",
      "packs.getPack",
      "packs.getDraft",
      "packs.inspectDraft",
    ],
    method: "POST",
    path: "/api/projects/:projectId/design-system-draft/save",
  },
  setPackPacks: {
    id: "packs.setPack",
    invalidates: [
      "packs.listSummary",
      "packs.list",
      "packs.getPack",
      "packs.getDraft",
      "packs.inspectDraft",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-system/save",
  },
  startEditorPacks: {
    id: "packs.startEditor",
    invalidates: ["packs.list"],
    method: "POST",
    path: "/api/packs/:packId/editor",
  },
  updatePackPacks: {
    id: "packs.updatePack",
    invalidates: ["packs.listSummary", "packs.list", "packs.getPack"],
    method: "PATCH",
    path: "/api/packs/:packId",
  },
} as const;

export { routes };

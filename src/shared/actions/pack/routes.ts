// @generated
const routes = {
  applyPackPack: {
    id: "pack.applyPack",
    invalidates: ["pack.getDraft", "pack.inspectDraft"],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-system/apply",
  },
  createDraftPack: {
    id: "pack.createDraft",
    invalidates: ["pack.listSummary", "pack.list", "pack.getPack"],
    method: "POST",
    path: "/api/design-systems/draft",
  },
  createPackPack: {
    id: "pack.createPack",
    invalidates: ["pack.listSummary", "pack.list", "pack.getPack"],
    method: "POST",
    path: "/api/packs",
  },
  deletePackPack: {
    id: "pack.deletePack",
    invalidates: ["pack.listSummary", "pack.list", "pack.getPack"],
    method: "DELETE",
    path: "/api/packs/:packId",
  },
  duplicatePackPack: {
    id: "pack.duplicatePack",
    invalidates: ["pack.listSummary", "pack.list", "pack.getPack"],
    method: "POST",
    path: "/api/packs/:packId/duplicate",
  },
  exportPackPack: {
    id: "pack.exportPack",
    invalidates: [],
    method: "GET",
    path: "/api/packs/:packId/export",
  },
  getDraftPack: {
    id: "pack.getDraft",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/design-system-draft",
  },
  getPackPack: {
    id: "pack.getPack",
    invalidates: [],
    method: "GET",
    path: "/api/packs/:packId/detail",
  },
  importPackPack: {
    id: "pack.importPack",
    invalidates: ["pack.listSummary", "pack.list", "pack.getPack"],
    method: "POST",
    path: "/api/packs/import",
  },
  inspectDraftPack: {
    id: "pack.inspectDraft",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/design-system-draft/status",
  },
  inspectPackPack: {
    id: "pack.inspectPack",
    invalidates: [],
    method: "GET",
    path: "/api/packs/:packId/check",
  },
  listPack: {
    id: "pack.list",
    invalidates: [],
    method: "GET",
    path: "/api/design-systems",
  },
  listProblemPack: {
    id: "pack.listProblem",
    invalidates: [],
    method: "GET",
    path: "/api/packs/problems",
  },
  listSummaryPack: {
    id: "pack.listSummary",
    invalidates: [],
    method: "GET",
    path: "/api/packs",
  },
  publishDraftPack: {
    id: "pack.publishDraft",
    invalidates: [
      "pack.listSummary",
      "pack.list",
      "pack.getPack",
      "pack.getDraft",
      "pack.inspectDraft",
    ],
    method: "POST",
    path: "/api/projects/:projectId/design-system-draft/save",
  },
  setPackPack: {
    id: "pack.setPack",
    invalidates: [
      "pack.listSummary",
      "pack.list",
      "pack.getPack",
      "pack.getDraft",
      "pack.inspectDraft",
    ],
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/design-system/save",
  },
  startEditorPack: {
    id: "pack.startEditor",
    invalidates: ["pack.list"],
    method: "POST",
    path: "/api/packs/:packId/editor",
  },
  updatePackPack: {
    id: "pack.updatePack",
    invalidates: ["pack.listSummary", "pack.list", "pack.getPack"],
    method: "PATCH",
    path: "/api/packs/:packId",
  },
} as const;

export { routes };

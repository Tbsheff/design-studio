// @generated
const routes = {
  exportExport: {
    id: "export.export",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/export",
  },
  exportFolderExport: {
    id: "export.exportFolder",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/export/files",
  },
  exportFrameExport: {
    id: "export.exportFrame",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/export/frame",
  },
  exportHandoffExport: {
    id: "export.exportHandoff",
    invalidates: [],
    method: "POST",
    path: "/api/projects/:projectId/handoff",
  },
  getCodeExport: {
    id: "export.getCode",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/copy-code",
  },
  getHandoffExport: {
    id: "export.getHandoff",
    invalidates: [],
    method: "GET",
    path: "/api/projects/:projectId/handoff/:folder/zip",
  },
} as const;

export { routes };

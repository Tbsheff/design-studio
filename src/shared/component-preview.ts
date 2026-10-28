export const COMPONENT_PREVIEW_PROPS_HEADER = 'x-studio-preview-meta';

export function componentPreviewPath(projectId: string, directionId: string, id: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/component-preview?id=${encodeURIComponent(id)}`;
}

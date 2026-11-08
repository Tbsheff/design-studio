import { projectRoutes, useAction } from "./deps.js";

interface AttentionImageState {
  readonly url: string | null;
}

const useAttentionImage = (
  projectId: string,
  path: string
): AttentionImageState => {
  const file = useAction(projectRoutes.getFileProject, { path, projectId });

  if (file.data === null) {
    return { url: null };
  }

  return { url: `data:${file.data.mimeType};base64,${file.data.data}` };
};

export { useAttentionImage };

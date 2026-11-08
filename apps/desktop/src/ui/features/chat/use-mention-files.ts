import { useEffect, useState, startTransition } from "react";

import { api } from "../../api.js";

const fileCache = new Map<string, Promise<string[]>>();

const requestFiles = async (
  projectId: string,
  directionId: string
): Promise<string[]> => {
  try {
    const result = await api.workTreeFiles(projectId, directionId);

    return result.files;
  } catch {
    return [];
  }
};

const loadFiles = (
  projectId: string,
  directionId: string,
  fresh: boolean
): Promise<string[]> => {
  const key = `${projectId}/${directionId}`;
  const known = fileCache.get(key);

  if (known && !fresh) {
    return known;
  }

  const next = requestFiles(projectId, directionId);

  fileCache.set(key, next);

  return next;
};

const useMentionFiles = (
  projectId: string,
  directionId: string | null | undefined,
  isFresh: boolean
): string[] | null => {
  const [files, setFiles] = useState<string[] | null>(null);

  useEffect(() => {
    if (!directionId) {
      return;
    }

    startTransition(async () => {
      setFiles(await loadFiles(projectId, directionId, isFresh));
    });
  }, [projectId, directionId, isFresh]);

  return files;
};

export { useMentionFiles };

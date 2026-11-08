import type { Project } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import { api } from "../../api.js";
import type { KeyedUrl } from "./home-model.js";

const blobCache = new Map<string, Promise<Blob>>();

const getThumbnailBlob = async (
  key: string,
  projectId: string,
  versionId: string
): Promise<Blob> => {
  try {
    return await api.thumbnail(projectId, versionId);
  } catch (error) {
    blobCache.delete(key);
    throw error;
  }
};

const getCachedBlob = (
  key: string,
  projectId: string,
  versionId: string
): Promise<Blob> => {
  const cached = blobCache.get(key);

  if (cached) {
    return cached;
  }

  const pending = getThumbnailBlob(key, projectId, versionId);
  blobCache.set(key, pending);

  return pending;
};

const toThumbnailKey = (project: Project): string | null => {
  if (project.thumbnail) {
    return `${project.id}/${project.thumbnail.versionId}`;
  }

  return null;
};

const useThumbnail = (project: Project): string | null => {
  const thumb = project.thumbnail ?? null;
  const key = toThumbnailKey(project);
  const [url, setUrl] = useState<KeyedUrl | null>(null);

  useEffect(() => {
    if (!key || !thumb) {
      return;
    }

    let isCancelled = false;
    let created: string | null = null;

    const load = async (): Promise<void> => {
      try {
        const blob = await getCachedBlob(key, project.id, thumb.versionId);

        const objectUrl = URL.createObjectURL(blob);

        if (isCancelled) {
          URL.revokeObjectURL(objectUrl);

          return;
        }

        created = objectUrl;
        setUrl({ key, url: objectUrl });
      } catch {
        created = null;
      }
    };

    void load();

    return (): void => {
      isCancelled = true;

      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [key, project.id, thumb]);

  if (url) {
    return url.url;
  }

  return null;
};

export { useThumbnail };

import { useEffect, useState } from "react";

import { api } from "../../api.js";
import type { ProjectHit } from "./deps.js";

interface ThumbUrl {
  readonly key: string;
  readonly url: string;
}

const cache = new Map<string, Promise<string>>();

const toDataUrl = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }

  return `data:${blob.type};base64,${btoa(binary)}`;
};

const getThumbUrl = async (id: string, thumbnail: string): Promise<string> =>
  toDataUrl(await api.thumbnail(id, thumbnail));

const toThumbUrl = (
  key: string,
  id: string,
  thumbnail: string
): Promise<string> => {
  const cached = cache.get(key);

  if (cached) {
    return cached;
  }

  const pending = getThumbUrl(id, thumbnail);
  cache.set(key, pending);

  return pending;
};

const toThumbKey = (id: string, thumbnail: string | null): string | null => {
  if (thumbnail) {
    return `${id}/${thumbnail}`;
  }

  return null;
};

const useThumb = (hit: ProjectHit): string | null => {
  const { id, thumbnail } = hit;
  const key = toThumbKey(id, thumbnail);
  const [thumb, setThumb] = useState<ThumbUrl | null>(null);

  useEffect(() => {
    if (!key || !thumbnail) {
      return;
    }

    let isLive = true;

    const apply = async (): Promise<void> => {
      try {
        const url = await toThumbUrl(key, id, thumbnail);

        if (isLive) {
          setThumb({ key, url });
        }
      } catch {
        cache.delete(key);
      }
    };

    apply();

    return (): void => {
      isLive = false;
    };
  }, [key, id, thumbnail]);

  if (thumb && thumb.key === key) {
    return thumb.url;
  }

  return null;
};

export { useThumb };

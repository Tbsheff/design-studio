import { useEffect, useState } from "react";

import { propsApi } from "./deps.js";
import type { VariantPreviewQuery } from "./deps.js";

type PreviewImage =
  | { readonly state: "loading" }
  | { readonly state: "none" }
  | { readonly src: string; readonly state: "ready" };

interface PreviewIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface Live {
  current: boolean;
  url: string | null;
}

const LOADING: PreviewImage = { state: "loading" };

const NONE: PreviewImage = { state: "none" };

const usePreviewImage = (
  ids: PreviewIds,
  query: VariantPreviewQuery,
  delayMs: number
): PreviewImage => {
  const [image, setImage] = useState<PreviewImage>(LOADING);
  const { className, file, key, name, value } = query;

  useEffect(() => {
    const live: Live = { current: true, url: null };

    const load = async (): Promise<void> => {
      setImage(LOADING);

      try {
        const blob = await propsApi.variantPreview(
          ids.projectId,
          ids.directionId,
          { className, file, key, name, value }
        );

        live.url = URL.createObjectURL(blob);

        if (live.current) {
          setImage({ src: live.url, state: "ready" });
        }
      } catch {
        if (live.current) {
          setImage(NONE);
        }
      }
    };

    const timer = setTimeout(() => {
      void load();
    }, delayMs);

    return (): void => {
      live.current = false;
      clearTimeout(timer);

      if (live.url) {
        URL.revokeObjectURL(live.url);
      }
    };
  }, [
    ids.projectId,
    ids.directionId,
    className,
    file,
    key,
    name,
    value,
    delayMs,
  ]);

  return image;
};

export { usePreviewImage };

export type { PreviewIds, PreviewImage };

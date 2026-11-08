import type { TrashItem } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import { getBlob } from "../../platform/http.js";

const useTrashThumb = (item: TrashItem): string | null => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item.thumbnail) {
      return;
    }

    let made: string | null = null;
    let isCancelled = false;

    const show = async (): Promise<void> => {
      try {
        const blob = await getBlob(
          `/api/trash/${encodeURIComponent(item.trashId)}/thumbnail`
        );

        if (!blob || isCancelled) {
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        made = objectUrl;
        setUrl(objectUrl);
      } catch {
        made = null;
      }
    };

    void show();

    return (): void => {
      isCancelled = true;

      if (made) {
        URL.revokeObjectURL(made);
      }
    };
  }, [item.trashId, item.thumbnail]);

  return url;
};

export { useTrashThumb };

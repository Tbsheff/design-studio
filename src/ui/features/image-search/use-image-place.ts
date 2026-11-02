import { useCallback, useMemo, useState, useTransition } from "react";

import { copy } from "./copy.js";
import { insertError } from "./deps.js";
import type {
  ImageSearchHit,
  PlaceImageResult,
  SelectionContext,
} from "./deps.js";
import { placePhoto } from "./image-search-api.js";
import type { PhotoIds } from "./image-search-api.js";
import { altOf } from "./image-search-model.js";

interface PlaceSetup {
  readonly ids: PhotoIds;
  readonly onDone: (message: string) => void;
  readonly query: string;
  readonly target: SelectionContext;
}

interface PhotoPlace {
  readonly problem: string | null;
  readonly handlePlace: (hit: ImageSearchHit) => void;
  readonly isPlacing: boolean;
  readonly placed: PlaceImageResult | null;
  readonly placingId: string | null;
}

const useImagePlace = (setup: PlaceSetup): PhotoPlace => {
  const { ids, onDone, query, target } = setup;
  const [placed, setPlaced] = useState<PlaceImageResult | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [isPlacing, startTransition] = useTransition();

  const savePhoto = useCallback(
    async (hit: ImageSearchHit): Promise<void> => {
      try {
        const result = await placePhoto(ids, {
          alt: altOf(hit, query),
          imageId: hit.id,
          target,
        });

        setPlaced(result);
        onDone(copy.placed);
      } catch (error) {
        setProblem(insertError(error));
      }

      setPlacingId(null);
    },
    [ids, onDone, query, target]
  );

  const handlePlace = useCallback(
    (hit: ImageSearchHit): void => {
      if (isPlacing) {
        return;
      }

      setProblem(null);
      setPlacingId(hit.id);
      startTransition(async () => {
        await savePhoto(hit);
      });
    },
    [isPlacing, savePhoto]
  );

  return useMemo(
    () => ({ handlePlace, isPlacing, placed, placingId, problem }),
    [problem, handlePlace, isPlacing, placed, placingId]
  );
};

export { useImagePlace };

export type { PhotoPlace };

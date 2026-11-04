import { useCallback, useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { copy } from "./copy.js";
import { insertError } from "./deps.js";
import type { ImageOrientation, ImageSearchHit } from "./deps.js";
import { searchPhotos } from "./image-search-api.js";
import type { PhotoIds, SearchStatus } from "./image-search-api.js";
import { useSearchStatus } from "./use-search-status.js";

interface PhotoSearch {
  readonly problem: string | null;
  readonly handleOrientation: (next: ImageOrientation) => void;
  readonly handleQuery: (next: string) => void;
  readonly handleSetting: (isOn: boolean) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly hits: readonly ImageSearchHit[] | null;
  readonly isPending: boolean;
  readonly orientation: ImageOrientation;
  readonly query: string;
  readonly status: SearchStatus | null;
}

const useImageSearch = (ids: PhotoIds): PhotoSearch => {
  const [query, setQuery] = useState("");
  const [orientation, setOrientation] = useState<ImageOrientation>("any");
  const [hits, setHits] = useState<readonly ImageSearchHit[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { handleSetting, status } = useSearchStatus({
    ids,
    setProblem,
    startTransition,
  });

  const handleQuery = setQuery;

  const run = useCallback(
    (words: string, picked: ImageOrientation): void => {
      if (words.trim() === "") {
        return;
      }

      setProblem(null);
      startTransition(async () => {
        try {
          const found = await searchPhotos(ids, words, picked);

          setHits(found.results);
        } catch (error) {
          setProblem(insertError(error) || copy.failed);
        }
      });
    },
    [ids]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      run(query, orientation);
    },
    [orientation, query, run]
  );

  const handleOrientation = useCallback(
    (next: ImageOrientation): void => {
      setOrientation(next);
      run(query, next);
    },
    [query, run]
  );

  return useMemo(
    () => ({
      handleOrientation,
      handleQuery,
      handleSetting,
      handleSubmit,
      hits,
      isPending,
      orientation,
      problem,
      query,
      status,
    }),
    [
      handleOrientation,
      handleQuery,
      handleSetting,
      handleSubmit,
      hits,
      isPending,
      orientation,
      problem,
      query,
      status,
    ]
  );
};

export { useImageSearch };

export type { PhotoSearch };

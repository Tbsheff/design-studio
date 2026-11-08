import { useEffect, useState, startTransition } from "react";

import { runQueryTerms } from "../../../shared/rewind.js";
import type { Hits } from "./chat-search-hits-model.js";
import { searchRunPage } from "./run-history-model.js";

const DEBOUNCE_MS = 150;

const useRunHits = (directionId: string | null, query: string): Hits | null => {
  const [hits, setHits] = useState<Hits | null>(null);
  const text = runQueryTerms(query).join(" ");

  useEffect(() => {
    if (!text || !directionId) {
      return;
    }

    let alive = true;

    const timer = globalThis.setTimeout(() => {
      startTransition(async () => {
        try {
          const page = await searchRunPage(directionId, text);

          if (alive) {
            setHits({
              failed: false,
              more: page.nextBefore !== null,
              query: text,
              runs: page.runs,
            });
          }
        } catch {
          if (alive) {
            setHits({ failed: true, more: false, query: text, runs: [] });
          }
        }
      });
    }, DEBOUNCE_MS);

    return (): void => {
      alive = false;
      globalThis.clearTimeout(timer);
    };
  }, [directionId, text]);

  if (!text || !directionId) {
    return null;
  }

  return hits;
};

export { useRunHits };

import { useCallback, useState, useTransition } from "react";

import { call, patternRoutes } from "./deps.js";
import { SITE_LIMIT, SITE_WIDTH } from "./pattern-model.js";
import type { PatternCandidate } from "./pattern-model.js";

interface SiteFindSetup {
  readonly onFound: () => void;
  readonly projectId: string;
  readonly url: string;
}

interface SiteFind {
  readonly candidates: readonly PatternCandidate[];
  readonly problem: string | null;
  readonly handleFind: () => void;
  readonly hasSearched: boolean;
  readonly isFinding: boolean;
}

const useSiteFind = (setup: SiteFindSetup): SiteFind => {
  const { onFound, projectId: project, url: address } = setup;
  const [candidates, setCandidates] = useState<readonly PatternCandidate[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFinding, startFind] = useTransition();

  const handleFind = useCallback((): void => {
    startFind(async () => {
      try {
        const found = await call(patternRoutes.inspectPattern, {
          cursor: null,
          hasThumbnails: true,
          limit: SITE_LIMIT,
          projectId: project,
          url: address.trim(),
          width: SITE_WIDTH,
        });

        setCandidates(found.items);
        setProblem(null);
        setHasSearched(true);
        onFound();
      } catch (error) {
        setProblem(String(error));
      }
    });
  }, [onFound, project, address]);

  return { candidates, handleFind, hasSearched, isFinding, problem };
};

export { useSiteFind };

export type { SiteFind, SiteFindSetup };

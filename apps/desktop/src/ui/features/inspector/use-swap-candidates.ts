import type { SourceLoc } from "@design-studio/contracts";
import { startTransition, useCallback, useEffect, useState } from "react";

import type {
  SwapCandidate,
  SwapCandidateList,
} from "../../../shared/component-create.js";

interface SwapApi {
  readonly listCandidates: (site: SwapSite) => Promise<SwapCandidateList>;
  readonly swap: (
    site: SwapSite,
    candidate: SwapCandidate
  ) => Promise<SwapDone>;
}

interface SwapSite {
  readonly projectId: string;
  readonly directionId: string;
  readonly use: SourceLoc;
}

interface SwapDone {
  readonly isOk: boolean;
  readonly text: string;
}

const useSwapList = (
  site: SwapSite,
  api: SwapApi
): SwapCandidateList | null => {
  const [list, setList] = useState<SwapCandidateList | null>(null);
  useEffect(() => {
    let isLive = true;
    startTransition(async () => {
      const result = await api.listCandidates(site);

      if (isLive) {
        setList(result);
      }
    });

    return (): void => {
      isLive = false;
    };
  }, [site, api]);

  return list;
};

interface SwapPick {
  readonly busyName: string | null;
  readonly pick: (candidate: SwapCandidate) => void;
}

const useSwapPick = (
  site: SwapSite,
  api: SwapApi,
  onDone: (result: SwapDone) => void,
  onClose: () => void
): SwapPick => {
  const [busyName, setBusyName] = useState<string | null>(null);

  const pick = useCallback(
    (candidate: SwapCandidate): void => {
      setBusyName(candidate.name);
      startTransition(async () => {
        const result = await api.swap(site, candidate);
        onDone(result);
        onClose();
      });
    },
    [site, api, onDone, onClose]
  );

  return { busyName, pick };
};

export { useSwapList, useSwapPick };

export type { SwapApi, SwapDone, SwapPick, SwapSite };

import type { PackProblem, PackSummary } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import { packApi } from "../../platform/pack-api.js";

const useLibraryProblems = (packs: PackSummary[] | null): PackProblem[] => {
  const [problems, setProblems] = useState<PackProblem[]>([]);

  useEffect(() => {
    if (packs === null) {
      return;
    }

    let live = true;

    const read = async (): Promise<void> => {
      let next: PackProblem[] = [];

      try {
        next = await packApi.packProblems();
      } catch {
        next = [];
      }

      if (live) {
        setProblems(next);
      }
    };

    read();

    return (): void => {
      live = false;
    };
  }, [packs]);

  return problems;
};

export { useLibraryProblems };

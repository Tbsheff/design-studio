import type { Starter } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import { api } from "../../api.js";

const MAX_STARTERS = 4;

const useStarters = (): Starter[] => {
  const [starters, setStarters] = useState<Starter[]>([]);
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const list = await api.starters();
        setStarters(list.slice(0, MAX_STARTERS));
      } catch {
        setStarters([]);
      }
    };

    load();
  }, []);

  return starters;
};

export { useStarters };

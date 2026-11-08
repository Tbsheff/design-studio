import type { AppRoute } from "@design-studio/contracts";
import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

const SLICE_200 = 200;

interface FlowSelection {
  readonly chosen: string[];
  readonly filter: string;
  readonly setFilter: Dispatch<SetStateAction<string>>;
  readonly shown: AppRoute[];
  readonly toggle: (route: string) => void;
}

const toRank = (chosen: string[], route: AppRoute): number => {
  if (chosen.includes(route.route)) {
    return chosen.indexOf(route.route);
  }

  return chosen.length;
};

const useFlowSelection = (routes: AppRoute[] | null): FlowSelection => {
  const [filter, setFilter] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();

    const found = (routes ?? []).filter(
      (route) =>
        needle === "" ||
        route.route.toLowerCase().includes(needle) ||
        route.file.toLowerCase().includes(needle)
    );

    return found
      .toSorted((left, right) => toRank(chosen, left) - toRank(chosen, right))
      .slice(0, SLICE_200);
  }, [routes, filter, chosen]);

  const toggle = useCallback((route: string): void => {
    setChosen((list) => {
      if (list.includes(route)) {
        return list.filter((entry) => entry !== route);
      }

      return [...list, route];
    });
  }, []);

  return { chosen, filter, setFilter, shown, toggle };
};

export { useFlowSelection };

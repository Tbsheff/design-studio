import { useEffect, useState } from "react";

import { readAccessibility } from "./accessibility-api.js";
import type { AccessibilityIds, InspectQuery } from "./accessibility-api.js";
import { insertError } from "./deps.js";
import type { AccessibilityReport } from "./deps.js";

interface AccessibilityLoad {
  readonly error: string | null;
  readonly loadKey: string;
  readonly report: AccessibilityReport | null;
}

const EMPTY: AccessibilityLoad = { error: null, loadKey: "", report: null };

const keyOf = (
  ids: AccessibilityIds,
  query: InspectQuery,
  round: string
): string =>
  `${ids.projectId}/${ids.directionId}/${query.frame ?? ""}/${query.selector ?? ""}/${String(query.passing)}#${round}`;

const useAccessibilityInfo = (
  ids: AccessibilityIds,
  query: InspectQuery,
  round: string,
  isOn: boolean
): AccessibilityLoad => {
  const [state, setState] = useState<AccessibilityLoad>(EMPTY);
  const key = keyOf(ids, query, round);

  useEffect(() => {
    if (!isOn) {
      return;
    }

    const live = { current: true };

    const load = async (): Promise<void> => {
      try {
        const report = await readAccessibility(ids, query);

        if (live.current) {
          setState({ error: null, loadKey: key, report });
        }
      } catch (error) {
        if (live.current) {
          setState({ error: insertError(error), loadKey: key, report: null });
        }
      }
    };

    void load();

    return (): void => {
      live.current = false;
    };
  }, [ids, isOn, key, query]);

  if (state.loadKey === key) {
    return state;
  }

  return { ...EMPTY, report: state.report };
};

export { useAccessibilityInfo };

export type { AccessibilityLoad };

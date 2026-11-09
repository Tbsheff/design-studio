import { routes } from "@design-studio/actions/studio/routes";
import { useEffect } from "react";

import { useNow } from "../../platform/clock.js";
import { subscribeDone, useAction } from "../../platform/query.js";
import type { ActivityWire } from "./activity-model.js";

interface ActivityState {
  readonly activity: ActivityWire | null;
  readonly error: Error | null;
  readonly now: number;
}

const ACTIVITY_INPUT = { limit: 8 } as const;
const CLOCK_STEP_MS = 30_000;

const useActivity = (): ActivityState => {
  const state = useAction(routes.getActivityStudio, ACTIVITY_INPUT);
  const { refetch } = state;
  const now = useNow(true, CLOCK_STEP_MS);

  useEffect(
    () =>
      subscribeDone((): void => {
        void refetch();
      }),
    [refetch]
  );

  useEffect(() => {
    const onFocus = (): void => {
      void refetch();
    };

    globalThis.addEventListener("focus", onFocus);

    return (): void => {
      globalThis.removeEventListener("focus", onFocus);
    };
  }, [refetch]);

  return { activity: state.data, error: state.error, now };
};

export { useActivity };

export type { ActivityState };

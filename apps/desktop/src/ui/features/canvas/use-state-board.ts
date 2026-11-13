import { routes } from "@design-studio/actions/canvas/routes";
import type { IconName } from "@design-studio/ui";
import { useCallback, useMemo, useTransition } from "react";

import { useAction } from "../../platform/query.js";
import { copy } from "./copy.js";

interface StateBoardItem {
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

const useStateBoard = (projectId: string, frame: string): StateBoardItem => {
  const { run } = useAction(routes.createStateFramesCanvas);
  const [, startBoard] = useTransition();

  const showStates = useCallback((): void => {
    startBoard(async () => {
      await run({ frame, projectId, states: null });
    });
  }, [frame, projectId, run]);

  return useMemo(
    (): StateBoardItem => ({
      icon: "layers",
      id: "show-all-states",
      label: copy.showAllStates,
      run: showStates,
    }),
    [showStates]
  );
};

export { useStateBoard };

export type { StateBoardItem };

import { routes as referenceRoutes } from "@design-studio/actions/reference/routes";
import type { IconName } from "@design-studio/ui";
import { useCallback, useMemo, useTransition } from "react";

import { useAction } from "../../platform/query.js";
import { copy } from "./copy.js";

interface FramePinItem {
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

interface FramePin {
  readonly isPinned: boolean;
  readonly item: FramePinItem;
}

const PIN_PAGE = 200;

const toPinLabel = (isPinned: boolean): string => {
  if (isPinned) {
    return copy.removeStyleReference;
  }

  return copy.useAsStyleReference;
};

const useFramePin = (projectId: string, frameId: string): FramePin => {
  const list = useAction(referenceRoutes.listReference, {
    cursor: null,
    limit: PIN_PAGE,
    projectId,
  });

  const { run } = useAction(referenceRoutes.setReference);
  const [, startPin] = useTransition();
  const pins = list.data?.items ?? [];
  const isPinned = pins.some((pin) => pin.id === frameId);

  const toggle = useCallback((): void => {
    const ids = { frameId, projectId };

    startPin(async () => {
      await run({ ...ids, isPinned: !isPinned });
    });
  }, [frameId, isPinned, projectId, run]);

  const item = useMemo(
    (): FramePinItem => ({
      icon: "palette",
      id: "style-reference",
      label: toPinLabel(isPinned),
      run: toggle,
    }),
    [isPinned, toggle]
  );

  return { isPinned, item };
};

export { useFramePin };

export type { FramePin, FramePinItem };

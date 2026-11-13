import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { TabOrderLayerProps } from "./tab-order-layer.js";
import { useOverlayMode } from "./tab-order-store.js";

interface TabOrderSlotProps extends Omit<
  TabOrderLayerProps,
  "directionId" | "round"
> {
  readonly directionId: string | null;
  readonly isBlocked: boolean;
  readonly lastChange: { readonly changedAt: number } | null;
}

const TabOrderLayer = lazy(async () => {
  const loaded = await import("./tab-order-layer.js");

  return { default: loaded.TabOrderLayer };
});

const ReaderLayer = lazy(async () => {
  const loaded = await import("./reader-layer.js");

  return { default: loaded.ReaderLayer };
});

const roundOf = (change: TabOrderSlotProps["lastChange"]): string => {
  if (change === null) {
    return "0";
  }

  return String(change.changedAt);
};

const TabOrderSlot = (props: TabOrderSlotProps): ReactElement | null => {
  const mode = useOverlayMode();
  const { directionId } = props;

  if (mode === "off" || props.isBlocked || directionId === null) {
    return null;
  }

  let Layer = TabOrderLayer;

  if (mode === "reader") {
    Layer = ReaderLayer;
  }

  return (
    <Suspense fallback={null}>
      <Layer
        directionId={directionId}
        frameId={props.frameId}
        frames={props.frames}
        kind={props.kind}
        projectId={props.projectId}
        round={roundOf(props.lastChange)}
        zoom={props.zoom}
      />
    </Suspense>
  );
};

export { TabOrderSlot };

export type { TabOrderSlotProps };

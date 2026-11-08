import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { setFramePath, frameName } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { FramePageMenu } from "./frame-controls.js";
import { toLiveVariation } from "./frame-label-state.js";
import type { GetLive } from "./frame-label-state.js";
import { FrameMoreMenu } from "./frame-more-menu.js";
import type { FrameMenuItem } from "./frame-more-menu.js";
import { VariationControls } from "./variation-controls.js";
import type { FrameVariation } from "./variation-controls.js";

interface FrameLabelExtrasProps {
  readonly frame: CanvasFrame;
  readonly did: string | null;
  readonly variation: FrameVariation | undefined;
  readonly isActive: boolean;
  readonly element: SelectionContext | null;
  readonly hasRoutes: boolean;
  readonly listPages: (() => Promise<string[]>) | null;
  readonly items: FrameMenuItem[];
  readonly getLive: GetLive;
}

const FrameLabelExtras = ({
  frame,
  did,
  variation,
  isActive,
  element,
  hasRoutes,
  listPages,
  items,
  getLive,
}: FrameLabelExtrasProps): ReactElement => {
  const frameId = frame.id;

  const liveVariation = useMemo(() => {
    if (variation && did) {
      return toLiveVariation(variation, did, getLive);
    }

    return null;
  }, [variation, did, getLive]);

  const onMixed = useCallback(
    (): void => getLive().setSelection(() => []),
    [getLive]
  );

  const onPath = useCallback(
    (path: string): void =>
      getLive().frames.update((canvasLayout) =>
        setFramePath(canvasLayout, frameId, path)
      ),
    [getLive, frameId]
  );

  return (
    <>
      {liveVariation && (
        <VariationControls
          variation={liveVariation}
          active={isActive}
          element={element}
          onMixed={onMixed}
        />
      )}
      <FramePageMenu
        path={frame.path ?? ""}
        routes={hasRoutes}
        listPages={listPages}
        onPath={onPath}
      />
      <FrameMoreMenu name={frame.label ?? frameName(frame)} items={items} />
    </>
  );
};

export { FrameLabelExtras };

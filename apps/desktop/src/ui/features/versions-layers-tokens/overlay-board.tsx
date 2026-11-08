import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { BoardEntry } from "./compare-board-types.js";
import { CompareFrame } from "./compare-frame.js";
import { CompareLabel } from "./compare-label.js";
import { CompareStage } from "./compare-stage.js";
import { OverlayControls } from "./overlay-controls.js";
import { OverlayMask } from "./overlay-mask.js";
import { useDiffMask } from "./use-diff-mask.js";

const DEFAULT_OPACITY = 70;

const OverlayBoard = ({ board }: BoardEntry): ReactNode => {
  const props = board;
  const { scale, viewport } = props;
  const [attempt, setAttempt] = useState(0);
  const [isShown, setIsShown] = useState(true);
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY);

  const { projectId } = props;
  const newer = props.newer.id;
  const older = props.older.id;
  const state = useDiffMask({ attempt, newer, older, projectId, viewport });

  const handleRetry = useCallback((): void => {
    setAttempt((count) => count + 1);
  }, []);

  const style = useMemo(
    () => ({ height: viewport.height * scale, width: viewport.width * scale }),
    [scale, viewport.height, viewport.width]
  );

  const labels = (
    <>
      <CompareLabel side="B" title={props.newerTitle} align="start" />
      <OverlayControls
        isShown={isShown}
        opacity={opacity}
        state={state}
        onOpacity={setOpacity}
        onRetry={handleRetry}
        onShown={setIsShown}
      />
    </>
  );

  return (
    <CompareStage width={viewport.width * scale} labels={labels}>
      <div className="compare-board locked" style={style}>
        <CompareFrame
          projectId={props.projectId}
          version={props.newer}
          title={props.newerTitle}
          kind={props.kind}
          viewport={viewport}
          scale={scale}
          onError={props.onError}
        />
        <OverlayMask isShown={isShown} opacity={opacity} state={state} />
      </div>
    </CompareStage>
  );
};

export { OverlayBoard };

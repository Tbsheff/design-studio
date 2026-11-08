import type { ProjectKind, Version } from "@design-studio/contracts";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useUi, writeStored } from "../../platform/storage.js";
import type { BoardProps } from "./compare-board-types.js";
import { CompareCodePane } from "./compare-code-pane.js";
import { MODE_KEY, toSavedMode } from "./compare-mode-model.js";
import type { Mode } from "./compare-mode-model.js";
import { ModeSwitch } from "./compare-mode-switch.js";
import { CompareStageBoard } from "./compare-stage-board.js";
import { CompareToolbar } from "./compare-toolbar.js";
import { useCompareLayout } from "./use-compare-layout.js";
import { displayTitle, indexVersions } from "./version-labels.js";

const toOrdered = (left: Version, right: Version): [Version, Version] => {
  if (left.createdAt <= right.createdAt) {
    return [left, right];
  }

  return [right, left];
};

interface CompareViewProps {
  projectId: string;
  kind: ProjectKind;
  left: Version;
  right: Version;
  versions?: Version[];
  onClose: () => void;
}

const CompareView = ({
  projectId,
  kind,
  left,
  right,
  versions,
  onClose,
}: CompareViewProps): ReactNode => {
  const { viewport } = useUi();
  const [mode, setMode] = useState<Mode>(toSavedMode);
  const [error, setError] = useState<string | null>(null);
  const { isStacked, ref, scale } = useCompareLayout(mode, viewport);
  const [older, newer] = toOrdered(left, right);
  const { height, width } = viewport;

  const index = useMemo(
    () => indexVersions(versions ?? [left, right]),
    [versions, left, right]
  );

  const handleMode = useCallback((next: Mode): void => {
    setMode(next);
    writeStored(MODE_KEY, next);
  }, []);

  const newerTitle = displayTitle(newer, index);
  const olderTitle = displayTitle(older, index);
  const onError = setError;
  const size = useMemo(() => ({ height, width }), [height, width]);

  const board = useMemo<BoardProps>(
    () => ({
      kind,
      newer,
      newerTitle,
      older,
      olderTitle,
      onError,
      projectId,
      scale,
      viewport: size,
    }),
    [
      kind,
      newer,
      newerTitle,
      older,
      olderTitle,
      onError,
      projectId,
      scale,
      size,
    ]
  );

  return (
    <div className="canvas">
      <CompareToolbar height={height} onClose={onClose} width={width}>
        <ModeSwitch mode={mode} onMode={handleMode} />
      </CompareToolbar>
      {mode === "code" && (
        <CompareCodePane projectId={projectId} older={older} newer={newer} />
      )}
      {mode !== "code" && (
        <CompareStageBoard
          board={board}
          error={error}
          isStacked={isStacked}
          mode={mode}
          stageRef={ref}
        />
      )}
    </div>
  );
};

export { CompareView };

export type { CompareViewProps };

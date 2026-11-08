import { useCallback } from "react";
import type { ReactElement } from "react";

import type { CanvasSource } from "../../domain/canvas-presets.js";
import { copy } from "./copy.js";
import { SourceRadio } from "./source-radio.js";
import { SourceViewing } from "./source-viewing.js";

interface SourceControlsProps {
  readonly hasHead: boolean;
  readonly onSource: (canvasSource: CanvasSource) => void;
  readonly source: CanvasSource;
}

const SourceControls = ({
  hasHead,
  onSource,
  source,
}: SourceControlsProps): ReactElement => {
  const onLive = useCallback(
    (): void => onSource({ kind: "live" }),
    [onSource]
  );

  const onLast = useCallback(
    (): void => onSource({ kind: "last" }),
    [onSource]
  );

  return (
    <div className="toolbar-group source">
      <div
        className="segmented source-seg"
        role="radiogroup"
        aria-label={copy.previewSource}
      >
        <SourceRadio
          icon="radio"
          isDisabled={false}
          isOn={source.kind === "live"}
          label={copy.live}
          onSelect={onLive}
          tip={copy.livePreview}
        />
        <SourceRadio
          icon="history"
          isDisabled={!hasHead}
          isOn={source.kind === "last"}
          label={copy.lastCompleted}
          onSelect={onLast}
          tip={copy.lastCompletedVersion}
        />
      </div>
      {source.kind === "version" && (
        <SourceViewing onBack={onLive} title={source.title} />
      )}
    </div>
  );
};

export { SourceControls };

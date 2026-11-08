import type { ReactElement, ReactNode } from "react";

import { PRESETS } from "../../domain/canvas-presets.js";
import type { CanvasSource } from "../../domain/canvas-presets.js";
import type { Viewport } from "../../platform/storage.js";
import { copy } from "./copy.js";
import { useViewportCustom } from "./use-viewport-custom.js";
import { ViewportDimsForm } from "./viewport-dims-form.js";
import { PresetRadio } from "./viewport-preset-radio.js";
import { ViewportRadio } from "./viewport-radio.js";

interface Props {
  viewport: Viewport;
  drawMode: boolean | null;
  onToggleDraw?: () => void;
  source: CanvasSource;
  onSource: (canvasSource: CanvasSource) => void;
  hasHead: boolean;
  checking: boolean;
  onCheck: () => void;
  addFrame?: ReactNode;
  theme?: { dark: boolean; onToggle: () => void };
  lofi?: { on: boolean; onToggle: () => void };
  links?: { on: boolean; onToggle: () => void };
  rulers?: { on: boolean; onToggle: () => void };
}

const ViewportControls = ({
  viewport,
}: {
  viewport: Viewport;
}): ReactElement => {
  const custom = useViewportCustom(viewport);
  const onCustom = custom.applyCustom;
  const isCustom = viewport.preset === "custom";

  return (
    <div className="toolbar-group">
      <div
        className="segmented icons"
        role="radiogroup"
        aria-label={copy.viewport}
      >
        {PRESETS.map((preset) => (
          <PresetRadio
            key={preset.id}
            isOn={viewport.preset === preset.id}
            preset={preset}
          />
        ))}
        <ViewportRadio
          icon="custom"
          isOn={isCustom}
          label={copy.custom}
          name="viewport-preset"
          onSelect={onCustom}
          tip={copy.customSize}
          tipAlign={null}
        />
      </div>
      {isCustom && <ViewportDimsForm custom={custom} />}
      {!isCustom && (
        <span className="dims-readout">
          {viewport.width}
          {copy.times2}
          {viewport.height}
        </span>
      )}
    </div>
  );
};

export { ViewportControls };

export type { Props };

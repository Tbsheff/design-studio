import type { RunLevel } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useId, useRef } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import { useDocumentBody } from "../../platform/document-body.js";
import { VariationsControl } from "../canvas/variations-control.js";
import { copy } from "./copy.js";
import { runSettingsSummary } from "./run-settings-model.js";
import type {
  DesignsSetting,
  EffortSetting,
  ModeSetting,
} from "./run-settings-model.js";
import { RunSettingsPanel } from "./run-settings-panel.js";
import { useRunSettingsPopover } from "./use-run-settings-popover.js";

interface Props {
  effort?: EffortSetting;
  mode?: ModeSetting;
  level: RunLevel;
  onLevel: (level: RunLevel) => void;
  designs?: DesignsSetting;
  onOpen?: () => void;
}

const RunSettings = ({
  mode,
  level: runLevel,
  onLevel,
  designs,
  onOpen,
  effort,
}: Props): ReactElement => {
  const id = useId();
  const body = useDocumentBody();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const pop = useRunSettingsPopover(trigger, panel, onOpen ?? null);
  const { onPanelKey, onToggle } = pop;
  const isDesignsOn = designs?.disabledReason === null;

  const summary = runSettingsSummary({
    designs: designs?.value,
    designsOn: isDesignsOn,
    effort: effort?.value ?? null,
    level: runLevel,
    mode: mode?.value,
  });

  return (
    <span className="run-settings">
      <button
        ref={trigger}
        type="button"
        className="btn small ghost run-settings-trigger"
        data-testid="run-settings"
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        data-tip={copy.runSettings}
        data-tip-side="top"
        data-tip-align="start"
        onClick={onToggle}
      >
        <span className="run-settings-summary">{summary}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      {pop.open &&
        body &&
        createPortal(
          <RunSettingsPanel
            panel={panel}
            placement={pop.placement}
            idBase={id}
            mode={mode ?? null}
            level={runLevel}
            effort={effort ?? null}
            designs={designs ?? null}
            DesignsControl={VariationsControl}
            onLevel={onLevel}
            onPanelKey={onPanelKey}
          />,
          body
        )}
    </span>
  );
};

export { RunSettings };

export type { ComposerMode } from "./composer-mode-model.js";

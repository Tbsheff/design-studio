import type { RunLevel } from "@design-studio/contracts";
import type { CSSProperties, KeyboardEvent, ReactElement, Ref } from "react";

import { copy } from "./copy.js";
import { DesignsGroup } from "./designs-group.js";
import type { DesignsControlType } from "./designs-group.js";
import { EffortGroup } from "./effort-group.js";
import { LevelGroup } from "./level-group.js";
import { ModeGroup } from "./mode-group.js";
import type {
  DesignsSetting,
  EffortSetting,
  ModeSetting,
} from "./run-settings-model.js";

const RunSettingsPanel = ({
  panel,
  placement,
  idBase,
  mode,
  level,
  effort,
  designs,
  DesignsControl,
  onLevel,
  onPanelKey,
}: {
  panel: Ref<HTMLDialogElement>;
  placement: CSSProperties;
  idBase: string;
  mode: ModeSetting | null;
  level: RunLevel;
  effort: EffortSetting | null;
  designs: DesignsSetting | null;
  DesignsControl: DesignsControlType;
  onLevel: (level: RunLevel) => void;
  onPanelKey: (event: KeyboardEvent) => void;
}): ReactElement => (
  <dialog
    open
    className="run-settings-pop"
    ref={panel}
    style={placement}
    aria-label={copy.runSettings}
    data-testid="run-settings-popover"
    onKeyDown={onPanelKey}
  >
    {mode && <ModeGroup mode={mode} hintId={`${idBase}-mode-hint`} />}
    <LevelGroup level={level} onLevel={onLevel} />
    {effort && <EffortGroup effort={effort} hintId={`${idBase}-effort-hint`} />}
    {designs && (
      <DesignsGroup
        designs={designs}
        labelId={`${idBase}-designs`}
        Control={DesignsControl}
      />
    )}
  </dialog>
);

export { RunSettingsPanel };

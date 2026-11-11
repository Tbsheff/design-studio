import type { ReactElement, ReactNode } from "react";

import { MODEL_OPTIONS } from "../../features/chat/settings-draft-model";
import type { SettingsDraft } from "../../features/chat/settings-draft-model";
import { SkillsChecklist } from "../../features/chat/skills-checklist";
import { copy } from "./copy";
import { SettingsCheckField } from "./settings-check-field";
import { SettingsModelField } from "./settings-model-field";
import { SettingsNumberField } from "./settings-number-field";
import { useSettingsDraft } from "./use-settings-draft";

interface SettingsFieldsProps {
  draft: SettingsDraft;
  onChange: (next: SettingsDraft) => void;
  children?: ReactNode;
}

const SettingsFields = ({
  draft,
  onChange,
  children,
}: SettingsFieldsProps): ReactElement => {
  const handlers = useSettingsDraft(draft, onChange);

  return (
    <div className="settings-fields">
      <SettingsModelField
        model={draft.model}
        onChange={handlers.handleModel}
        options={MODEL_OPTIONS}
      />
      <SettingsNumberField
        ariaLabel="Max turns"
        label={copy.maxTurnsPerRun}
        max={200}
        min={1}
        name="maxTurns"
        onChange={handlers.handleTurns}
        placeholder={null}
        step={1}
        value={draft.maxTurns}
      />
      <SettingsCheckField
        isChecked={draft.allowBash}
        isDisabled={false}
        label={copy.allowAgentToRunShell}
        name="allowBash"
        onChange={handlers.handleBash}
      />
      <SettingsCheckField
        isChecked={draft.allowBash && draft.allowInstall}
        isDisabled={!draft.allowBash}
        label={copy.allowInstallingPackages}
        name="allowInstall"
        onChange={handlers.handleInstall}
      />
      <SettingsCheckField
        isChecked={draft.allowBash && draft.autoApprove}
        isDisabled={!draft.allowBash}
        label={copy.autoModeRunCommandsWithout}
        name="autoApprove"
        onChange={handlers.handleAuto}
      />
      <p className="warn-line">{copy.theseAreOnByDefault}</p>
      {children}
      <SkillsChecklist
        disabled={draft.disabledSkills}
        allowBash={draft.allowBash}
        onChange={handlers.handleSkills}
      />
    </div>
  );
};

export { SettingsFields };

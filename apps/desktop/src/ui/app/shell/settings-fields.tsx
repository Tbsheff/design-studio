import type { ReactNode, ReactElement } from "react";

import { MODEL_OPTIONS } from "../../features/chat/settings-draft-model";
import type { SettingsDraft } from "../../features/chat/settings-draft-model";
import { SkillsChecklist } from "../../features/chat/skills-checklist";
import { copy } from "./copy";

export {
  modelLabel,
  parseDraft,
  toDraft,
  type SettingsDraft,
} from "../../features/chat/settings-draft-model";

interface Props {
  draft: SettingsDraft;
  onChange: (next: SettingsDraft) => void;
  shellExtra?: ReactNode;
}

export const SettingsFields = ({
  draft,
  onChange,
  shellExtra,
}: Props): ReactElement => {
  const set = (patch: Partial<SettingsDraft>): void =>
    onChange({ ...draft, ...patch });

  const known = MODEL_OPTIONS.some(
    (modelValue) => modelValue.id === draft.model
  );

  return (
    <div className="settings-fields">
      <label className="field">
        <span>{copy.model}</span>
        <select
          className="select"
          aria-label="Model"
          value={draft.model}
          onChange={(event) => set({ model: event.target.value })}
        >
          {MODEL_OPTIONS.map((modelValue) => (
            <option key={modelValue.id} value={modelValue.id}>
              {modelValue.label}
            </option>
          ))}
          {!known && <option value={draft.model}>{draft.model}</option>}
        </select>
      </label>
      <label className="field">
        <span>{copy.spendingLimitPerRun}</span>
        <input
          aria-label="Spending limit per run"
          type="number"
          min={0.01}
          max={50}
          step={0.01}
          placeholder="No limit"
          value={draft.maxBudgetUsd}
          onChange={(event) => set({ maxBudgetUsd: event.target.value })}
        />
      </label>
      <label className="field">
        <span>{copy.maxTurnsPerRun}</span>
        <input
          aria-label="Max turns"
          type="number"
          min={1}
          max={200}
          step={1}
          value={draft.maxTurns}
          onChange={(event) => set({ maxTurns: event.target.value })}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.allowBash}
          onChange={(event) =>
            set({
              allowBash: event.target.checked,
              allowInstall: event.target.checked && draft.allowInstall,
            })
          }
        />
        <span>{copy.allowAgentToRunShell}</span>
      </label>
      <label className={`check ${draft.allowBash ? "" : "disabled"}`}>
        <input
          type="checkbox"
          checked={draft.allowBash && draft.allowInstall}
          disabled={!draft.allowBash}
          onChange={(event) => set({ allowInstall: event.target.checked })}
        />
        <span>{copy.allowInstallingPackages}</span>
      </label>
      <label className={`check ${draft.allowBash ? "" : "disabled"}`}>
        <input
          type="checkbox"
          checked={draft.allowBash && draft.autoApprove}
          disabled={!draft.allowBash}
          onChange={(event) => set({ autoApprove: event.target.checked })}
        />
        <span>{copy.autoModeRunCommandsWithout}</span>
      </label>
      <p className="warn-line">{copy.theseAreOnByDefault}</p>
      {shellExtra}
      <SkillsChecklist
        disabled={draft.disabledSkills}
        allowBash={draft.allowBash}
        onChange={(disabledSkills) => set({ disabledSkills })}
      />
    </div>
  );
};

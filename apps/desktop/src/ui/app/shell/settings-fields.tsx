import type { ReactNode, ReactElement } from "react";

import { MODEL_OPTIONS } from "../../features/chat/settings-draft-model";
import type { SettingsDraft } from "../../features/chat/settings-draft-model";
import { SkillsChecklist } from "../../features/chat/skills-checklist";

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

  const known = MODEL_OPTIONS.some((m) => m.id === draft.model);

  return (
    <div className="settings-fields">
      <label className="field">
        <span>Model</span>
        <select
          className="select"
          aria-label="Model"
          value={draft.model}
          onChange={(e) => set({ model: e.target.value })}
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          {!known && <option value={draft.model}>{draft.model}</option>}
        </select>
      </label>
      <label className="field">
        <span>Spending limit per run</span>
        <input
          aria-label="Spending limit per run"
          type="number"
          min={0.01}
          max={50}
          step={0.01}
          placeholder="No limit"
          value={draft.maxBudgetUsd}
          onChange={(e) => set({ maxBudgetUsd: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Max turns per run</span>
        <input
          aria-label="Max turns"
          type="number"
          min={1}
          max={200}
          step={1}
          value={draft.maxTurns}
          onChange={(e) => set({ maxTurns: e.target.value })}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.allowBash}
          onChange={(e) =>
            set({
              allowBash: e.target.checked,
              allowInstall: e.target.checked && draft.allowInstall,
            })
          }
        />
        <span>Allow agent to run shell commands</span>
      </label>
      <label className={`check ${draft.allowBash ? "" : "disabled"}`}>
        <input
          type="checkbox"
          checked={draft.allowBash && draft.allowInstall}
          disabled={!draft.allowBash}
          onChange={(e) => set({ allowInstall: e.target.checked })}
        />
        <span>Allow installing packages</span>
      </label>
      <label className={`check ${draft.allowBash ? "" : "disabled"}`}>
        <input
          type="checkbox"
          checked={draft.allowBash && draft.autoApprove}
          disabled={!draft.allowBash}
          onChange={(e) => set({ autoApprove: e.target.checked })}
        />
        <span>Auto mode: run commands without asking</span>
      </label>
      <p className="warn-line">
        These are on by default. Shell commands run on this computer in the
        project folder, and installs download and run third-party code. Turn
        them off for projects you do not trust.
      </p>
      {shellExtra}
      <SkillsChecklist
        disabled={draft.disabledSkills}
        allowBash={draft.allowBash}
        onChange={(disabledSkills) => set({ disabledSkills })}
      />
    </div>
  );
};

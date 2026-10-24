import { MODEL_OPTIONS, type SettingsDraft } from '../settingsDraft';
import { SkillsChecklist } from './SkillsChecklist';

export { modelLabel, parseDraft, toDraft, type SettingsDraft } from '../settingsDraft';

interface Props {
  draft: SettingsDraft;
  onChange: (next: SettingsDraft) => void;
}

export function SettingsFields({ draft, onChange }: Props) {
  const set = (patch: Partial<SettingsDraft>) => onChange({ ...draft, ...patch });
  const known = MODEL_OPTIONS.some((m) => m.id === draft.model);
  return (
    <div className="settings-fields">
      <label className="field">
        <span>Model</span>
        <select className="select" aria-label="Model" value={draft.model} onChange={(e) => set({ model: e.target.value })}>
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
          onChange={(e) => set({ allowBash: e.target.checked, allowInstall: e.target.checked && draft.allowInstall })}
        />
        <span>Allow agent to run shell commands</span>
      </label>
      <label className={`check ${draft.allowBash ? '' : 'disabled'}`}>
        <input
          type="checkbox"
          checked={draft.allowBash && draft.allowInstall}
          disabled={!draft.allowBash}
          onChange={(e) => set({ allowInstall: e.target.checked })}
        />
        <span>Allow installing packages</span>
      </label>
      <p className="warn-line">
        Shell commands run on this computer in the project folder. Installs download and run third-party code. Turn these on
        only for projects you trust.
      </p>
      <SkillsChecklist disabled={draft.disabledSkills} allowBash={draft.allowBash} onChange={(disabledSkills) => set({ disabledSkills })} />
    </div>
  );
}

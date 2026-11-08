import type { AttachedApp } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { isEnvSet } from "./app-settings-model";
import { copy } from "./copy";
import { EnvSuggestion } from "./env-suggestion";
import { useSettingsForm } from "./use-settings-form";

interface SettingsTabProps {
  readonly app: AttachedApp;
  readonly onSaved: () => void;
  readonly projectId: string;
  readonly suggested: Record<string, string> | null;
}

const SettingsTab = ({
  app,
  onSaved,
  projectId,
  suggested,
}: SettingsTabProps): ReactElement => {
  const form = useSettingsForm({ app, onSaved, projectId, suggested });

  return (
    <form className="app-settings" onSubmit={form.handleSubmit}>
      <label className="field">
        <span>{copy.devServerUrl}</span>
        <input
          name="url"
          className="mono"
          value={form.url}
          placeholder="Empty: the studio starts next dev"
          spellCheck={false}
          onChange={form.handleUrl}
        />
      </label>
      <label className="field">
        <span>{copy.environmentForNextDev}</span>
        <textarea
          name="env"
          className="mono"
          rows={5}
          value={form.env}
          placeholder="No variables set"
          spellCheck={false}
          onChange={form.handleEnv}
        />
        <small className="field-help">{copy.oneKeyValuePerLine}</small>
      </label>
      {suggested && !isEnvSet(suggested, form.env) && (
        <EnvSuggestion onAdd={form.handleAdd} suggested={suggested} />
      )}
      <div className="app-settings-foot">
        {form.note && <output className="app-panel-sub">{form.note}</output>}
        <button
          type="submit"
          className="btn small primary"
          disabled={form.isSaving}
        >
          {copy.saveAndRestart}
        </button>
      </div>
    </form>
  );
};

export { SettingsTab };

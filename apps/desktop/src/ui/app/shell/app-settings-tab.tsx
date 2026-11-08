import type { AppServerStatus, AttachedApp } from "@design-studio/contracts";
import { envText, parseEnvText } from "@design-studio/contracts/app";
import { useState, useTransition } from "react";
import type { ReactElement, FormEvent } from "react";

import { api, errorText } from "../../api";

const envSuggestion = (
  status: AppServerStatus | null
): Record<string, string> | null => {
  const fix = status?.doctor?.causes.find(
    (cause) => cause.fix?.kind === "set-env"
  )?.fix;

  return fix?.kind === "set-env" ? fix.env : null;
};

const SettingsTab = ({
  projectId,
  app,
  suggested,
  onSaved,
}: {
  projectId: string;
  app: AttachedApp;
  suggested: Record<string, string> | null;
  onSaved: () => void;
}): ReactElement => {
  const [url, setUrl] = useState(app.url ?? "");
  const [env, setEnv] = useState(() => envText(app.env));
  const [note, setNote] = useState<string | null>(null);
  const [busy, startSave] = useTransition();

  const save = (event: FormEvent): void => {
    event.preventDefault();
    const parsed = parseEnvText(env);

    if (parsed.bad.length > 0) {
      setNote(`Use KEY=value lines. Not valid: ${parsed.bad[0] ?? ""}`);

      return;
    }

    setNote(null);
    startSave(async () => {
      try {
        await api.appConfig(projectId, { env: parsed.env, url: url.trim() });
        setNote("Saved. The dev server restarts.");
        onSaved();
      } catch (error) {
        setNote(errorText(error));
      }
    });
  };

  return (
    <form className="app-settings" onSubmit={save}>
      <label className="field">
        <span>Dev server URL</span>
        <input
          className="mono"
          value={url}
          placeholder="Empty: the studio starts next dev"
          spellCheck={false}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Environment for next dev</span>
        <textarea
          className="mono"
          rows={5}
          value={env}
          placeholder="No variables set"
          spellCheck={false}
          onChange={(e) => setEnv(e.target.value)}
        />
        <small className="field-help">
          One KEY=value per line. The studio keeps these in the project file, so
          do not paste secrets.
        </small>
      </label>
      {suggested &&
        !Object.keys(suggested).every(
          (key) => parseEnvText(env).env[key] !== undefined
        ) && (
          <div className="app-env-suggest">
            <span className="app-panel-sub grow">
              The doctor suggests{" "}
              <span className="mono">{envText(suggested)}</span>
            </span>
            <button
              type="button"
              className="btn small"
              onClick={() =>
                setEnv((text) =>
                  [text.trim(), envText(suggested)].filter(Boolean).join("\n")
                )
              }
            >
              Add
            </button>
          </div>
        )}
      <div className="app-settings-foot">
        {note && (
          <span className="app-panel-sub" role="status">
            {note}
          </span>
        )}
        <button type="submit" className="btn small primary" disabled={busy}>
          Save and restart
        </button>
      </div>
    </form>
  );
};

export { envSuggestion, SettingsTab };

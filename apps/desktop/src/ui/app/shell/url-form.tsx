import type { AttachedApp } from "@design-studio/contracts";
import { useCallback, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { api, errorText } from "../../api";
import { pick } from "../../platform/pick.js";
import { copy } from "./copy";

interface UrlFormProps {
  readonly app: AttachedApp;
  readonly onSaved: () => void;
  readonly projectId: string;
  readonly suggested: string;
}

const toInitialUrl = (app: AttachedApp, suggested: string): string => {
  if (app.mode === "url") {
    return app.url ?? "";
  }

  return suggested;
};

const UrlForm = ({
  app,
  onSaved,
  projectId,
  suggested,
}: UrlFormProps): ReactElement => {
  const [url, setUrl] = useState(() => toInitialUrl(app, suggested));
  const [isSaving, startSave] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);

  const save = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();

      if (!url.trim()) {
        return;
      }

      setFailure(null);
      startSave(async () => {
        try {
          await api.appConfig(projectId, { url: url.trim() });
          onSaved();
        } catch (error) {
          setFailure(errorText(error));
        }
      });
    },
    [onSaved, projectId, url]
  );

  const changeUrl = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setUrl(event.target.value),
    []
  );

  return (
    <form className="app-fail-url" onSubmit={save}>
      <label className="app-fail-label" htmlFor="app-fail-url">
        {pick(
          app.mode === "url",
          "Dev server URL",
          "Or use a dev server you started"
        )}
      </label>
      <div className="app-fail-url-row">
        <input
          id="app-fail-url"
          name="url"
          className="mono"
          value={url}
          placeholder="http://localhost:3000"
          spellCheck={false}
          autoComplete="off"
          onChange={changeUrl}
        />
        <button
          type="submit"
          className="btn small"
          disabled={isSaving || !url.trim()}
        >
          {copy.confirmUrl}
        </button>
      </div>
      {failure && <span className="app-fail-error">{failure}</span>}
    </form>
  );
};

export { UrlForm };

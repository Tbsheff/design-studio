import type { AttachedApp } from "@design-studio/contracts";
import { envText, parseEnvText } from "@design-studio/contracts/app";
import { useCallback, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { api, errorText } from "../../api";

interface SettingsFormInput {
  readonly app: AttachedApp;
  readonly onSaved: () => void;
  readonly projectId: string;
  readonly suggested: Record<string, string> | null;
}

interface SettingsForm {
  readonly handleAdd: () => void;
  readonly handleEnv: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly handleUrl: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly env: string;
  readonly isSaving: boolean;
  readonly note: string | null;
  readonly handleSubmit: (event: FormEvent) => void;
  readonly url: string;
}

const useSettingsForm = ({
  app,
  onSaved,
  projectId,
  suggested,
}: SettingsFormInput): SettingsForm => {
  const [url, setUrl] = useState(app.url ?? "");
  const [env, setEnv] = useState(() => envText(app.env));
  const [note, setNote] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  const handleSubmit = useCallback(
    (event: FormEvent): void => {
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
    },
    [env, onSaved, projectId, url]
  );

  const handleUrl = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setUrl(event.target.value),
    []
  );

  const handleEnv = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void =>
      setEnv(event.target.value),
    []
  );

  const handleAdd = useCallback((): void => {
    if (suggested) {
      setEnv((text) =>
        [text.trim(), envText(suggested)].filter(Boolean).join("\n")
      );
    }
  }, [suggested]);

  return {
    env,
    handleAdd,
    handleEnv,
    handleSubmit,
    handleUrl,
    isSaving,
    note,
    url,
  };
};

export { useSettingsForm };

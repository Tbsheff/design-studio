import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { MOCK_EXAMPLE, toFormText } from "./frame-state-ui-model.js";
import type { MockRules } from "./frame-state-ui-model.js";
import { runOrReport } from "./settle-model.js";

interface RulesRead {
  readonly message: string | null;
  readonly rules: MockRules;
}

const toRules = (text: string): RulesRead => {
  let parsed: MockRules | null = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      message: "Rules must be JSON: a list of { path, status?, body? }.",
      rules: [],
    };
  }

  if (!Array.isArray(parsed)) {
    return { message: "Rules must be a list.", rules: [] };
  }

  return { message: null, rules: parsed };
};

const MockForm = ({
  onSave,
  onBack,
}: {
  onSave: (name: string, rules: MockRules) => Promise<void>;
  onBack: () => void;
}): ReactElement => {
  const [error, setError] = useState<string | null>(null);
  const nameField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameField.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const { message, rules } = toRules(toFormText(data, "rules"));

      if (message) {
        setError(message);

        return;
      }

      await runOrReport(onSave(toFormText(data, "name"), rules), (failure) =>
        setError(failure.message)
      );
    },
    [onSave]
  );

  return (
    <form className="frame-state-form" onSubmit={handleSubmit}>
      <label className="frame-page-field">
        <span>{copy.name}</span>
        <input ref={nameField} name="name" defaultValue="Mock data" />
      </label>
      <label className="frame-page-field">
        <span>{copy.answersForCallsFrom}</span>
        <textarea
          className="frame-state-rules"
          name="rules"
          defaultValue={MOCK_EXAMPLE}
          spellCheck={false}
          rows={6}
          aria-invalid={Boolean(error)}
        />
      </label>
      <p className="frame-page-hint">{copy.aPathThatEnds}</p>
      {error && <p className="frame-page-hint error">{error}</p>}
      <div className="frame-state-actions">
        <button type="button" className="btn small ghost" onClick={onBack}>
          {copy.back}
        </button>
        <button type="submit" className="btn small strong">
          {copy.showInThisFrame}
        </button>
      </div>
    </form>
  );
};

export { MockForm };

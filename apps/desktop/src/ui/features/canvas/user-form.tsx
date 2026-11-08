import type { MockUser } from "@design-studio/contracts/frame-state";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { toFormText } from "./frame-state-ui-model.js";
import { runOrReport } from "./settle-model.js";

const UserForm = ({
  user,
  onSave,
  onBack,
}: {
  user: MockUser;
  onSave: (user: MockUser) => Promise<void>;
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

      await runOrReport(
        onSave({
          email: toFormText(data, "email"),
          name: toFormText(data, "name"),
        }),
        (failure) => setError(failure.message)
      );
    },
    [onSave]
  );

  return (
    <form className="frame-state-form" onSubmit={handleSubmit}>
      <label className="frame-page-field">
        <span>{copy.name}</span>
        <input ref={nameField} name="name" defaultValue={user.name} />
      </label>
      <label className="frame-page-field">
        <span>{copy.email}</span>
        <input
          name="email"
          defaultValue={user.email}
          spellCheck={false}
          aria-invalid={Boolean(error)}
        />
      </label>
      {error && <p className="frame-page-hint error">{error}</p>}
      <div className="frame-state-actions">
        <button type="button" className="btn small ghost" onClick={onBack}>
          {copy.back}
        </button>
        <button type="submit" className="btn small strong">
          {copy.save}
        </button>
      </div>
    </form>
  );
};

export { UserForm };

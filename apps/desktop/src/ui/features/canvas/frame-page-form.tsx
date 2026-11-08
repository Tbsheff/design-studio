import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { toPageHint, toPagePlaceholder } from "./page-name-model.js";

const FramePageForm = ({
  path,
  routes,
  hasList,
  apply,
}: {
  path: string;
  routes: boolean;
  hasList: boolean;
  apply: (raw: string) => boolean;
}): ReactElement => {
  const [draft, setDraft] = useState(path);
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      setInvalid(!apply(draft));
    },
    [apply, draft]
  );

  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value);
      setInvalid(false);
    },
    []
  );

  return (
    <form onSubmit={handleSubmit}>
      <label className="frame-page-field">
        <span>{copy.path}</span>
        <input
          ref={input}
          name="path"
          value={draft}
          spellCheck={false}
          aria-invalid={invalid}
          placeholder={toPagePlaceholder(routes, hasList)}
          onChange={updateDraft}
        />
      </label>
      {invalid && <p className="frame-page-hint error">{toPageHint(routes)}</p>}
    </form>
  );
};

export { FramePageForm };

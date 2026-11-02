import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { TEXT_STYLE_NAME } from "./deps.js";

import styles from "./text-styles.module.css";

interface CreateFieldProps {
  readonly busy: boolean;
  readonly onCancel: () => void;
  readonly onCreate: (name: string) => Promise<boolean>;
}

const submitLabel = (busy: boolean): string => {
  if (busy) {
    return copy.createBusy;
  }

  return copy.save;
};

const CreateField = ({
  busy,
  onCancel,
  onCreate,
}: CreateFieldProps): ReactElement => {
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const valid = TEXT_STYLE_NAME.test(name.trim());

  useEffect(() => {
    input.current?.focus();
  }, []);

  const changeName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setName(event.target.value.toLowerCase());
    },
    []
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (valid && !busy) {
        void onCreate(name.trim());
      }
    },
    [busy, name, onCreate, valid]
  );

  return (
    <form className={styles.create} noValidate onSubmit={handleSubmit}>
      <input
        aria-describedby={hintId}
        aria-invalid={name !== "" && !valid}
        aria-label={copy.name}
        className={styles.name}
        name="name"
        placeholder="card-title"
        ref={input}
        spellCheck={false}
        value={name}
        onChange={changeName}
      />
      <p className={styles.hint} id={hintId}>
        {copy.nameHint}
      </p>
      <div className={styles.actions}>
        <button className="btn small ghost" type="button" onClick={onCancel}>
          {copy.cancel}
        </button>
        <button
          className="btn small primary"
          disabled={!valid || busy}
          type="submit"
        >
          {submitLabel(busy)}
        </button>
      </div>
    </form>
  );
};

export { CreateField };

import { useCallback, useEffect, useRef } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";

import { COPY } from "./copy.js";

interface ForkFormProps {
  readonly error: string | null;
  readonly fromTitle: string;
  readonly name: string;
  readonly onCancel: () => void;
  readonly onName: (value: string) => void;
  readonly onSubmit: (event: FormEvent) => void;
}

const ForkForm = (props: ForkFormProps): ReactNode => {
  const { onName } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onName(event.target.value);
    },
    [onName]
  );

  return (
    <form className="fork-form" onSubmit={props.onSubmit}>
      <div className="fork-from">{`${COPY.forkBranchFrom}${props.fromTitle}`}</div>
      <input
        ref={inputRef}
        name="direction"
        value={props.name}
        onChange={handleNameChange}
        aria-label={COPY.labelDirectionName}
      />
      {props.error && <div className="alert error">{props.error}</div>}
      <div className="row end">
        <button
          type="button"
          className="btn ghost small"
          onClick={props.onCancel}
        >
          {COPY.forkCancel}
        </button>
        <button type="submit" className="btn primary small">
          {COPY.forkCreate}
        </button>
      </div>
    </form>
  );
};

export { ForkForm };

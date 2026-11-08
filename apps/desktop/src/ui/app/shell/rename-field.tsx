import { useCallback, useEffect, useRef } from "react";
import type { FocusEvent, KeyboardEvent, ReactElement } from "react";

interface RenameFieldProps {
  readonly name: string;
  readonly onDone: (next: string | null) => void;
}

const toRenamed = (
  isSaving: boolean,
  value: string,
  name: string
): string | null => {
  const trimmed = value.trim();

  if (isSaving && trimmed && trimmed !== name) {
    return trimmed;
  }

  return null;
};

const RenameField = ({ name, onDone }: RenameFieldProps): ReactElement => {
  const done = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const finish = useCallback(
    (isSaving: boolean): void => {
      if (done.current) {
        return;
      }

      done.current = true;
      onDone(toRenamed(isSaving, input.current?.value ?? name, name));
    },
    [name, onDone]
  );

  const selectAll = useCallback(
    (event: FocusEvent<HTMLInputElement>): void => event.currentTarget.select(),
    []
  );

  const saveOnBlur = useCallback((): void => finish(true), [finish]);

  const finishOnKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        finish(true);
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
      }
    },
    [finish]
  );

  return (
    <input
      ref={input}
      name="name"
      className="pane-rename"
      aria-label="Project name"
      defaultValue={name}
      onFocus={selectAll}
      onBlur={saveOnBlur}
      onKeyDown={finishOnKey}
    />
  );
};

export { RenameField };

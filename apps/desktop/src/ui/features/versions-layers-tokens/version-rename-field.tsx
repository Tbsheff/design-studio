import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent, ReactNode } from "react";

import { COPY } from "./copy.js";

const NAME_MAX = 80;

interface VersionRenameFieldProps {
  readonly fallback: string;
  readonly initial: string;
  readonly onCancel: () => void;
  readonly onCommit: (name: string | null) => void;
}

const selectAll = (event: FocusEvent<HTMLInputElement>): void => {
  event.currentTarget.select();
};

const toNormalizedName = (value: string): string =>
  value.trim().replaceAll(/\s+/gu, " ");

const toCommittedName = (name: string, fallback: string): string | null => {
  if (name === "" || name === fallback) {
    return null;
  }

  return name;
};

const VersionRenameField = ({
  fallback,
  initial,
  onCancel,
  onCommit,
}: VersionRenameFieldProps): ReactNode => {
  const [value, setValue] = useState(initial);
  const isDone = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const finish = useCallback(
    (name: string | null, isCancelled: boolean): void => {
      if (isDone.current) {
        return;
      }

      isDone.current = true;

      if (isCancelled) {
        onCancel();
      } else {
        onCommit(name);
      }
    },
    [onCancel, onCommit]
  );

  const commitName = useCallback((): void => {
    const name = toNormalizedName(value);

    finish(toCommittedName(name, fallback), name === initial);
  }, [fallback, finish, initial, value]);

  const handleNameKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      event.stopPropagation();

      if (event.key === "Enter") {
        event.preventDefault();
        commitName();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        finish(null, true);
      }
    },
    [commitName, finish]
  );

  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setValue(event.target.value);
    },
    []
  );

  return (
    <input
      ref={inputRef}
      className="version-rename"
      aria-label={COPY.labelVersionName}
      value={value}
      maxLength={NAME_MAX}
      placeholder={fallback}
      spellCheck={false}
      onFocus={selectAll}
      onChange={handleNameChange}
      onKeyDown={handleNameKeyDown}
      onBlur={commitName}
    />
  );
};

export { VersionRenameField };

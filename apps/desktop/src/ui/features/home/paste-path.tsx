import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";

interface PastePathProps {
  readonly label: string;
  readonly action: string;
  readonly onSubmit: (path: string) => void;
}

const PastePath = ({
  label,
  action,
  onSubmit,
}: PastePathProps): ReactElement => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();

      if (value.trim()) {
        onSubmit(value.trim());
      }
    },
    [onSubmit, value]
  );

  const change = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setValue(event.target.value);
  }, []);

  return (
    <form className="paste-path" onSubmit={submit}>
      <input
        ref={inputRef}
        name="path"
        aria-label={label}
        value={value}
        onChange={change}
        placeholder={copy.usersMeProjects}
        spellCheck={false}
      />
      <button className="btn small" type="submit" disabled={!value.trim()}>
        {action}
      </button>
    </form>
  );
};

export { PastePath };

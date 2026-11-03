import { useCallback, useState } from "react";
import type { ChangeEvent, ReactElement, SyntheticEvent } from "react";

import { copy } from "./copy.js";

interface KeyFormProps {
  readonly isPending: boolean;
  readonly onCreate: (name: string, canWrite: boolean) => void;
}

const KeyForm = ({ isPending, onCreate }: KeyFormProps): ReactElement => {
  const [name, setName] = useState("");
  const [canWrite, setCanWrite] = useState(false);

  const handleName = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  }, []);

  const handleWrite = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setCanWrite(event.target.checked);
  }, []);

  const handleSubmit = useCallback(
    (event: SyntheticEvent): void => {
      event.preventDefault();
      onCreate(name.trim(), canWrite);
      setName("");
    },
    [canWrite, name, onCreate]
  );

  return (
    <form onSubmit={handleSubmit}>
      <input
        aria-label={copy.namePlaceholder}
        name="key-name"
        placeholder={copy.namePlaceholder}
        value={name}
        onChange={handleName}
      />
      <label>
        <input
          checked={canWrite}
          name="key-write"
          type="checkbox"
          onChange={handleWrite}
        />
        {copy.write}
      </label>
      <button type="submit" disabled={isPending || name.trim() === ""}>
        {copy.create}
      </button>
    </form>
  );
};

export { KeyForm };

import { useCallback, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./block.module.css";

interface RegistryAddFormProps {
  readonly isBusy: boolean;
  readonly onAdd: (name: string) => void;
}

const RegistryAddForm = ({
  isBusy,
  onAdd,
}: RegistryAddFormProps): ReactElement => {
  const [name, setName] = useState("");

  const handleName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setName(event.target.value),
    []
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      onAdd(name);
    },
    [name, onAdd]
  );

  return (
    <form className={styles.addForm} onSubmit={handleSubmit}>
      <input
        aria-label={copy.addNameLabel}
        className={styles.addInput}
        name="item"
        onChange={handleName}
        placeholder={copy.addNamePlaceholder}
        value={name}
      />
      <button
        className={styles.primary}
        data-tip={copy.addTip}
        disabled={isBusy || name.trim() === ""}
        type="submit"
      >
        {copy.addSubmit}
      </button>
    </form>
  );
};

export { RegistryAddForm };

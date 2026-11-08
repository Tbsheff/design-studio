import { useCallback, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { LayerStyleGroupRow } from "./layer-style-group-row.js";
import {
  DEFAULT_GROUPS,
  GROUP_CHOICES,
  toToggled,
} from "./layer-style-model.js";
import type { StyleGroup } from "./layer-style-model.js";
import type { LayerStyleHost } from "./use-layer-style-host.js";

import styles from "./layer-style.module.css";

interface LayerStylePickerFormProps {
  readonly host: LayerStyleHost;
}

const toSubmitLabel = (isPending: boolean): string => {
  if (isPending) {
    return copy.applying;
  }

  return copy.apply;
};

const LayerStylePickerForm = ({
  host,
}: LayerStylePickerFormProps): ReactElement => {
  const [picked, setPicked] = useState<readonly StyleGroup[]>(DEFAULT_GROUPS);
  const { apply, close, isPending } = host;

  const handleToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const group = event.currentTarget.name as StyleGroup;
    const { checked } = event.currentTarget;

    setPicked((current) => toToggled(current, group, checked));
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      apply(picked);
    },
    [apply, picked]
  );

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <strong className={styles.title}>{copy.pickTitle}</strong>
      <fieldset aria-label={copy.groupsLabel} className={styles.groups}>
        {GROUP_CHOICES.map((choice) => (
          <LayerStyleGroupRow
            choice={choice}
            isChecked={picked.includes(choice.group)}
            key={choice.group}
            onToggle={handleToggle}
          />
        ))}
      </fieldset>
      <div className={styles.actions}>
        <button
          className={styles.primary}
          disabled={picked.length === 0 || isPending}
          type="submit"
        >
          {toSubmitLabel(isPending)}
        </button>
        <button className={styles.small} onClick={close} type="button">
          {copy.cancel}
        </button>
      </div>
    </form>
  );
};

export { LayerStylePickerForm };

import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { toChoice } from "./choice-model.js";
import { write } from "./layout-keys.js";
import type { DirectEdit } from "./use-direct-edit.js";

const ICON_SIZE = 14;

const SelfButton = ({
  edit,
  icon,
  label,
  value,
  current,
}: {
  readonly edit: DirectEdit;
  readonly icon: IconName;
  readonly label: string;
  readonly value: string;
  readonly current: string;
}): ReactElement => {
  const isOn = current === value;

  const toggle = useCallback(() => {
    write(edit, { "align-self": toChoice(isOn, "", value) });
  }, [edit, isOn, value]);

  return (
    <button
      type="button"
      className={toChoice(isOn, "on", "")}
      aria-label={label}
      aria-pressed={isOn}
      data-tip={label}
      onClick={toggle}
    >
      <Icon name={icon} size={ICON_SIZE} />
    </button>
  );
};

export { SelfButton };

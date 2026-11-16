import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toMenuOptions, toMenuValue } from "./state-styles-model.js";
import type { ChipId, MenuEntry } from "./state-styles-model.js";
import type { StateStylesView } from "./use-state-styles.js";

import styles from "./state-styles.module.css";

interface StateMenuProps {
  readonly state: StateStylesView;
}

const toOption = (entry: MenuEntry): UiSelectOption<ChipId> => {
  if (entry.hasStyles) {
    return {
      disabled: entry.isDisabled,
      icon: <span aria-hidden="true" className={styles.menuDot} />,
      label: copy.label[entry.chip],
      value: entry.chip,
    };
  }

  return {
    disabled: entry.isDisabled,
    label: copy.label[entry.chip],
    value: entry.chip,
  };
};

const StateMenu = ({ state }: StateMenuProps): ReactElement => {
  const { chips, handlePick, info, isOff, styled } = state;

  const options = useMemo(
    () =>
      toMenuOptions(chips, styled, info, isOff).map((entry) => toOption(entry)),
    [chips, info, isOff, styled]
  );

  return (
    <span className={styles.menu}>
      <UiSelect
        size="sm"
        aria-label={copy.groupLabel}
        tip={copy.menuTip}
        value={toMenuValue(state.active)}
        options={options}
        onChange={handlePick}
      />
    </span>
  );
};

export { StateMenu };

import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { ColorValue } from "./token-inputs.js";
import type { TokenRowProps } from "./token-row-types.js";

const DARK_ICON_SIZE = 12;

type TokenDarkSlotProps = Pick<
  TokenRowProps,
  "entry" | "onEdit" | "shown" | "swatchFor"
>;

const TokenDarkSlot = ({
  entry,
  onEdit,
  shown,
  swatchFor,
}: TokenDarkSlotProps): ReactNode => {
  const name = entry.cssVar;
  const { darkValue } = shown;

  const handleAddDark = useCallback((): void => {
    onEdit(entry, "darkValue", shown.value);
  }, [entry, onEdit, shown.value]);

  const handleEditDark = useCallback(
    (next: string): void => {
      onEdit(entry, "darkValue", next);
    },
    [entry, onEdit]
  );

  const handleRemoveDark = useCallback((): void => {
    onEdit(entry, "darkValue", null);
  }, [entry, onEdit]);

  if (darkValue === null) {
    return (
      <button
        type="button"
        className="tkp-nodark"
        aria-label={`${COPY.tokenAddDarkPrefix}${name}`}
        onClick={handleAddDark}
      >
        <Icon name="moon" size={DARK_ICON_SIZE} />
        {COPY.tokenNoDark}
      </button>
    );
  }

  return (
    <div className="tkp-dark">
      <ColorValue
        label={`${name} dark value`}
        path={entry.path}
        trail="moon"
        value={darkValue}
        swatch={swatchFor(darkValue, true)}
        onChange={handleEditDark}
      />
      <button
        type="button"
        className="icon-btn small tkp-drop"
        aria-label={`${COPY.tokenRemoveDarkPrefix}${name}`}
        data-tip={COPY.tipRemoveDarkValue}
        data-tip-align="end"
        onClick={handleRemoveDark}
      >
        <Icon name="close" size={DARK_ICON_SIZE} />
      </button>
    </div>
  );
};

export { TokenDarkSlot };

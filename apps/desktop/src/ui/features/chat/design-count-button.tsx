import { useCallback } from "react";
import type { ReactElement } from "react";

import type { DesignsSetting } from "./run-settings.js";

const toCountLabel = (count: number): string => {
  if (count === 1) {
    return "1 design";
  }

  return `${count} designs`;
};

const DesignCountButton = ({
  count,
  designs,
}: {
  count: number;
  designs: DesignsSetting;
}): ReactElement => {
  const isOff = count > 1 && designs.disabledReason !== null;
  const { onChange } = designs;

  const pickCount = useCallback((): void => {
    if (!isOff) {
      onChange(count);
    }
  }, [count, isOff, onChange]);

  return (
    <button
      type="button"
      role="menuitemradio"
      className="composer-menu-count"
      aria-label={toCountLabel(count)}
      aria-checked={designs.value === count}
      aria-disabled={isOff}
      tabIndex={-1}
      onClick={pickCount}
    >
      {count}
    </button>
  );
};

export { DesignCountButton };

import { useCallback } from "react";
import type { ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import type { DesignMdView } from "./new-design-system-values.js";

const DesignMdTab = ({
  tab,
  label,
  isOn,
  onSelect,
}: {
  tab: DesignMdView;
  label: string;
  isOn: boolean;
  onSelect: (view: DesignMdView) => void;
}): ReactElement => {
  const selectTab = useCallback((): void => onSelect(tab), [onSelect, tab]);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isOn}
      className={toChoice(isOn, "nds-tab on", "nds-tab ")}
      onClick={selectTab}
    >
      {label}
    </button>
  );
};

export { DesignMdTab };

import { useCallback } from "react";
import type { ReactElement } from "react";

import { homePrefs } from "./home-prefs-model.js";
import type { FilterTab } from "./library-model.js";
import { toClassName } from "./project-card-model.js";

interface FilterChipProps {
  readonly item: FilterTab;
  readonly isOn: boolean;
}

const FilterChip = ({ item, isOn }: FilterChipProps): ReactElement => {
  const select = useCallback((): void => {
    homePrefs.set({ filter: item.id });
  }, [item.id]);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isOn}
      className={toClassName(isOn && "on")}
      onClick={select}
    >
      {item.label}
    </button>
  );
};

export { FilterChip };

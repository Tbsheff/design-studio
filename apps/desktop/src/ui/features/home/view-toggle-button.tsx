import { useCallback } from "react";
import type { ReactElement } from "react";

import { homePrefs } from "./home-prefs-model.js";
import { ViewIcon } from "./view-icon.js";

interface ViewToggleButtonProps {
  readonly view: "list" | "grid";
  readonly current: "list" | "grid";
  readonly label: string;
  readonly tipAlign: string | null;
}

const ViewToggleButton = ({
  view,
  current,
  label,
  tipAlign,
}: ViewToggleButtonProps): ReactElement => {
  const select = useCallback((): void => {
    homePrefs.set({ view });
  }, [view]);

  return (
    <button
      type="button"
      aria-pressed={view === current}
      aria-label={label}
      data-tip={label}
      data-tip-align={tipAlign}
      onClick={select}
    >
      <ViewIcon view={view} />
    </button>
  );
};

export { ViewToggleButton };

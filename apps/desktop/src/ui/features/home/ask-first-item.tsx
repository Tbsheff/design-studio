import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { homePrefs, useHomePrefs } from "./home-prefs-model.js";

const ICON_SIZE = 14;

const AskFirstItem = (): ReactElement => {
  const { shouldAskFirst } = useHomePrefs();

  const toggle = useCallback((): void => {
    homePrefs.set({ shouldAskFirst: !shouldAskFirst });
  }, [shouldAskFirst]);

  return (
    <div className="ui-menu-section">
      <button
        type="button"
        role="menuitemcheckbox"
        className="ui-menu-item"
        aria-checked={shouldAskFirst}
        onClick={toggle}
      >
        <Icon name="sparkle" size={ICON_SIZE} />
        <span className="truncate">{copy.askOnShortBriefs}</span>
      </button>
    </div>
  );
};

export { AskFirstItem };

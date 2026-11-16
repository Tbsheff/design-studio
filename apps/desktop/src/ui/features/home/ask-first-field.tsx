import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { homePrefs, useHomePrefs } from "./home-prefs-model.js";

const AskFirstField = (): ReactElement => {
  const { shouldAskFirst } = useHomePrefs();

  const change = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    homePrefs.set({ shouldAskFirst: event.target.checked });
  }, []);

  return (
    <label className="check">
      <input
        name="askFirst"
        type="checkbox"
        checked={shouldAskFirst}
        onChange={change}
      />
      <span>{copy.askOnShortBriefs}</span>
    </label>
  );
};

export { AskFirstField };

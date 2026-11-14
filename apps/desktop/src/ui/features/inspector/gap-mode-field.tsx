import { UiSelect } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { toGapMode, toGapPatch } from "./auto-layout-model.js";
import { copy } from "./copy.js";
import { GAP_MENU, toGapMenuMode } from "./divider-model.js";
import type { GapMenuMode } from "./divider-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useDividerView } from "./use-divider.js";
import { useLastGap } from "./use-last-gap.js";
import { setEdit } from "./use-layout-keys.js";

interface Props {
  readonly edit: DirectEdit;
}

const GapModeField = ({ edit }: Props): ReactElement => {
  const mode = toGapMode(edit.values["justify-content"]);
  const lastGap = useLastGap(edit.values.gap);
  const view = useDividerView();
  const divider = view?.divider ?? null;
  const shown = toGapMenuMode(mode, divider);

  const handleMode = useCallback(
    (next: GapMenuMode): void => {
      if (next === shown) {
        return;
      }

      if (next === "lines") {
        view?.setLines(true);

        return;
      }

      if (divider !== null) {
        view?.setLines(false);
      }

      if (next !== mode) {
        setEdit(edit, toGapPatch(next, lastGap));
      }
    },
    [divider, edit, lastGap, mode, shown, view]
  );

  return (
    <div
      className="ins-field select ins-gap-mode"
      data-tip={copy.autoPutsTheSpaceBetween}
      data-tip-align="end"
    >
      <span className="ins-scrub static">{copy.spacing}</span>
      <UiSelect
        aria-label={copy.gapMode}
        value={shown}
        options={GAP_MENU}
        onChange={handleMode}
      />
    </div>
  );
};

export { GapModeField };

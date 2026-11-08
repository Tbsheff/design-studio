import { UiSelect } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { GAP_MODES, toGapMode, toGapPatch } from "./auto-layout-model.js";
import type { GapMode } from "./auto-layout-model.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useLastGap } from "./use-last-gap.js";
import { setEdit } from "./use-layout-keys.js";

interface Props {
  readonly edit: DirectEdit;
}

const GapModeField = ({ edit }: Props): ReactElement => {
  const mode = toGapMode(edit.values["justify-content"]);
  const lastGap = useLastGap(edit.values.gap);

  const handleMode = useCallback(
    (next: GapMode): void => {
      if (next !== mode) {
        setEdit(edit, toGapPatch(next, lastGap));
      }
    },
    [edit, lastGap, mode]
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
        value={mode}
        options={GAP_MODES}
        onChange={handleMode}
      />
    </div>
  );
};

export { GapModeField };

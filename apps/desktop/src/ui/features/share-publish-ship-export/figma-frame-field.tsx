import type { FigmaFrameInfo } from "@design-studio/contracts/figma-nodes";
import { UiSelect } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toFrameLabel } from "./figma-import-model.js";

interface Props {
  readonly chosen: string;
  readonly frames: readonly FigmaFrameInfo[];
  readonly onChange: (nodeId: string) => void;
}

const FigmaFrameField = ({
  chosen,
  frames,
  onChange,
}: Props): ReactElement | null => {
  const options = useMemo(
    () =>
      frames.map((frame) => ({ label: toFrameLabel(frame), value: frame.id })),
    [frames]
  );

  if (frames.length < 2) {
    return null;
  }

  return (
    <div className="field">
      <span>{copy.frame}</span>
      <UiSelect
        aria-label={copy.frame}
        value={chosen}
        options={options}
        onChange={onChange}
      />
    </div>
  );
};

export { FigmaFrameField };

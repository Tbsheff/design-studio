import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { RunFeedback, Thumb } from "./run-feedback-model.js";
import { ThumbButton } from "./thumb-button.js";

const RunThumbs = ({
  thumb,
  onChange,
}: {
  thumb: Thumb | null;
  onChange: (patch: Partial<RunFeedback>) => void;
}): ReactElement => {
  const onPick = useCallback(
    (picked: Thumb | null) => onChange({ thumb: picked }),
    [onChange]
  );

  return (
    <fieldset className="run-thumbs" aria-label={copy.rateThisResponse}>
      <ThumbButton value="up" isOn={thumb === "up"} onPick={onPick} />
      <ThumbButton value="down" isOn={thumb === "down"} onPick={onPick} />
    </fieldset>
  );
};

export { RunThumbs };

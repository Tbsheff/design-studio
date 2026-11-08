import { useCallback } from "react";
import type { ReactElement } from "react";

import type { Thumb } from "./run-feedback-model.js";
import { ThumbIcon } from "./thumb-icon.js";

const ThumbButton = ({
  value,
  isOn,
  onPick,
}: {
  value: Thumb;
  isOn: boolean;
  onPick: (value: Thumb | null) => void;
}): ReactElement => {
  let label: "Good response" | "Bad response" = "Bad response";

  if (value === "up") {
    label = "Good response";
  }

  const onClick = useCallback(() => {
    if (isOn) {
      onPick(null);
    } else {
      onPick(value);
    }
  }, [isOn, onPick, value]);

  return (
    <button
      type="button"
      className="icon-btn small feedback-thumb"
      aria-label={label}
      aria-pressed={isOn}
      data-tip={label}
      data-tip-side="top"
      onClick={onClick}
    >
      <ThumbIcon isDown={value === "down"} />
    </button>
  );
};

export { ThumbButton };

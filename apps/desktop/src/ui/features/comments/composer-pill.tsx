import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { Icon } from "./deps.js";

const Pill = ({
  icon,
  label,
  tip,
  tone,
  value,
  onRemove,
}: {
  icon: Parameters<typeof Icon>[0]["name"] | null;
  label: string;
  tip: string | null;
  tone: string;
  value: string;
  onRemove: (value: string) => void;
}): ReactElement => {
  const removeSelf = useCallback(
    (): void => onRemove(value),
    [onRemove, value]
  );

  return (
    <span
      className={`comment-pill ${tone}`}
      data-tip={tip}
      data-tip-side="top"
      data-testid="comment-pill"
    >
      {icon && <Icon name={icon} size={12} />}
      <span className="comment-pill-label">{label}</span>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${copy.textRemove} ${label}`}
        onClick={removeSelf}
      >
        <Icon name="close" size={10} />
      </button>
    </span>
  );
};

export { Pill };

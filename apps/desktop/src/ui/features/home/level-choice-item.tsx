import { useId } from "react";
import type { ReactElement } from "react";

const LevelChoiceItem = ({
  label,
  hint,
  meta = null,
  full,
  checked,
  focusable = false,
  onPick,
}: {
  label: string;
  hint: string;
  meta?: string | null;
  full: string;
  checked: boolean;
  focusable?: boolean;
  onPick: () => void;
}): ReactElement => {
  const id = useId();

  let tabIndex = -1;

  if (focusable && checked) {
    tabIndex = 0;
  }

  return (
    <button
      type="button"
      role="menuitemradio"
      className="ui-menu-item choice-item"
      aria-checked={checked}
      aria-describedby={id}
      tabIndex={tabIndex}
      onClick={onPick}
    >
      <span className="choice-label">{label}</span>
      <span className="choice-hint" aria-hidden="true">
        {hint}
      </span>
      {meta && (
        <span className="ui-menu-meta" aria-hidden="true">
          {meta}
        </span>
      )}
      <span id={id} hidden>
        {full}
      </span>
    </button>
  );
};

export { LevelChoiceItem };

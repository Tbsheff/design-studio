import { useCallback } from "react";
import type { ReactElement } from "react";

interface Props {
  count: number;
  label: string;
  name: string;
  openName: string | null;
  tip: string;
  onToggle: (name: string) => void;
}

const RowToggleButton = ({
  count,
  label,
  name,
  onToggle,
  openName,
  tip,
}: Props): ReactElement => {
  const toggle = useCallback((): void => {
    onToggle(name);
  }, [name, onToggle]);

  return (
    <button
      type="button"
      className="btn ghost small"
      aria-expanded={openName === name}
      onClick={toggle}
      data-tip={tip}
    >
      {label}
      {count}
    </button>
  );
};

export { RowToggleButton };

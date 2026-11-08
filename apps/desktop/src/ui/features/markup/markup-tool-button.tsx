import { useCallback } from "react";
import type { ReactElement } from "react";

import type { MarkupTool } from "./markup-model.js";

import styles from "./markup.module.css";

interface MarkupToolButtonProps {
  readonly isActive: boolean;
  readonly label: string;
  readonly onPick: (tool: MarkupTool) => void;
  readonly tool: MarkupTool;
}

const MarkupToolButton = ({
  isActive,
  label,
  onPick,
  tool,
}: MarkupToolButtonProps): ReactElement => {
  const handlePick = useCallback((): void => onPick(tool), [onPick, tool]);

  return (
    <button
      aria-pressed={isActive}
      className={`btn small ${styles.tool}`}
      onClick={handlePick}
      type="button"
    >
      {label}
    </button>
  );
};

export { MarkupToolButton };

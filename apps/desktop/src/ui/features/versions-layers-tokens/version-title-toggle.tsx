import { useCallback } from "react";
import type { KeyboardEvent, ReactNode, Ref } from "react";

interface VersionTitleToggleProps {
  readonly controls: string | undefined;
  readonly isExpanded: boolean;
  readonly onExpand: () => void;
  readonly onStartRename: () => void;
  readonly ref: Ref<HTMLButtonElement>;
  readonly tip: string;
  readonly title: string;
}

const VersionTitleToggle = ({
  controls,
  isExpanded,
  onExpand,
  onStartRename,
  ref,
  tip,
  title,
}: VersionTitleToggleProps): ReactNode => {
  const handleTitleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>): void => {
      if (event.key === "F2") {
        event.preventDefault();
        onStartRename();
      }
    },
    [onStartRename]
  );

  return (
    <button
      ref={ref}
      type="button"
      className="version-toggle"
      data-tip={tip}
      data-tip-align="start"
      aria-expanded={isExpanded}
      aria-controls={controls}
      aria-keyshortcuts="F2"
      onClick={onExpand}
      onDoubleClick={onStartRename}
      onKeyDown={handleTitleKeyDown}
    >
      <span>{title}</span>
    </button>
  );
};

export { VersionTitleToggle };

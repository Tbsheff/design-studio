import type { ReactNode } from "react";

const toTitleTip = (
  title: string,
  onRename: (() => void) | undefined
): string => {
  if (onRename) {
    return `${title} (double-click to rename)`;
  }

  return title;
};

const RunTitle = ({
  title,
  slot,
  onRename,
}: {
  title: string | undefined;
  slot: ReactNode;
  onRename: (() => void) | undefined;
}): ReactNode => {
  if (slot) {
    return slot;
  }

  if (!title) {
    return null;
  }

  return (
    <span
      className="run-title"
      data-testid="run-title"
      data-tip={toTitleTip(title, onRename)}
      onDoubleClick={onRename}
    >
      {title}
    </span>
  );
};

export { RunTitle };

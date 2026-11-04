import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { AnimationPanel } from "./animation-panel.js";
import { copy } from "./copy.js";
import type { ParentMessageBody } from "./deps.js";

import styles from "./animation.module.css";

interface AnimationEntryProps {
  readonly directionId: string;
  readonly post: (body: ParentMessageBody) => void;
  readonly projectId: string;
  readonly selector: string | null;
}

const AnimationEntry = ({
  directionId,
  post,
  projectId,
  selector,
}: AnimationEntryProps): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback((): void => setIsOpen(true), []);
  const handleClose = useCallback((): void => setIsOpen(false), []);

  if (!isOpen) {
    return (
      <button
        className={styles.toggle}
        data-tip={copy.animation}
        onClick={handleOpen}
        type="button"
      >
        {copy.animation}
      </button>
    );
  }

  return (
    <AnimationPanel
      directionId={directionId}
      onClose={handleClose}
      post={post}
      projectId={projectId}
      selector={selector}
    />
  );
};

export { AnimationEntry };

export type { AnimationEntryProps };

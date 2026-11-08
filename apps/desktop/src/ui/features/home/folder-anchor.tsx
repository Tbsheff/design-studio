import { Suspense } from "react";
import type { ReactElement, RefObject } from "react";

import type { AppChip } from "./app-chip-model.js";
import { AppSlot } from "./app-slot.js";
import type { PopState } from "./composer-pop-model.js";
import { FolderPathPop } from "./lazy-parts.js";

interface FolderAnchorProps {
  readonly pops: PopState;
  readonly chip: AppChip | null;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly onAddFolder: () => void;
  readonly onDoctor: () => void;
  readonly onFolderPick: (path: string) => void;
  readonly onFolderClose: (shouldRefocus: boolean) => void;
}

const FolderAnchor = ({
  pops,
  chip,
  triggerRef,
  onAddFolder,
  onDoctor,
  onFolderPick,
  onFolderClose,
}: FolderAnchorProps): ReactElement => (
  <div className="home-anchor">
    <AppSlot
      chip={chip}
      pop={pops.pop}
      folderRef={triggerRef}
      onAddFolder={onAddFolder}
      onDoctor={onDoctor}
    />
    {pops.shown === "folder" && (
      <Suspense fallback={null}>
        <FolderPathPop
          trigger={triggerRef}
          isClosing={pops.isClosing}
          onClose={onFolderClose}
          onPick={onFolderPick}
        />
      </Suspense>
    )}
  </div>
);

export { FolderAnchor };

import type { SharedSource } from "@design-studio/contracts/app";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import {
  toShortLoc,
  toSharedLine,
  toSourceLoc,
} from "./inspector-shared-model.js";

interface Props {
  readonly shared: SharedSource;
  readonly isEditingUse: boolean;
  readonly canUse: boolean;
  readonly onToggle: () => void;
}

const SharedSourceNote = ({
  shared,
  isEditingUse,
  canUse,
  onToggle,
}: Props): ReactElement => {
  const what = shared.name ?? shared.file.split("/").pop() ?? shared.file;

  if (isEditingUse && shared.use) {
    return (
      <div className="ins-shared" role="note">
        <span>
          {copy.editsGoToThisUse}
          {what} {copy.in}{" "}
          <code data-tip={toSourceLoc(shared.use)}>
            {toShortLoc(shared.use)}
          </code>
        </span>
        <button type="button" className="btn small ghost" onClick={onToggle}>
          {copy.editEvery}
          {what}
        </button>
      </div>
    );
  }

  return (
    <div className="ins-shared" role="note">
      <span>{toSharedLine(shared.name ?? null, what)}</span>
      {canUse && shared.use && (
        <button type="button" className="btn small" onClick={onToggle}>
          {copy.editThisUseInstead}
        </button>
      )}
    </div>
  );
};

export { SharedSourceNote };

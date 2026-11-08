import type { ShipPrepare } from "@design-studio/contracts/ship";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ShipDiffView } from "./ship-diff-view.js";
import { ShipFileRow } from "./ship-file-row.js";
import type { Draft } from "./ship-model.js";

interface ShipFileListProps {
  readonly plan: ShipPrepare;
  readonly draft: Draft;
  readonly focus: string | null;
  readonly onFocus: (path: string) => void;
  readonly onToggle: (path: string) => void;
}

const ShipFileList = ({
  draft,
  focus,
  onFocus,
  onToggle,
  plan,
}: ShipFileListProps): ReactElement => (
  <div className="ship-files-wrap">
    <ul className="ship-files" aria-label={copy.changedFiles}>
      {plan.files.map((file) => (
        <ShipFileRow
          key={file.path}
          file={file}
          isActive={file.path === focus}
          isChecked={draft.files.has(file.path)}
          onFocus={onFocus}
          onToggle={onToggle}
        />
      ))}
    </ul>
    <ShipDiffView
      file={plan.files.find((entry) => entry.path === focus) ?? null}
    />
  </div>
);

export { ShipFileList };

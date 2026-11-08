import type { TextSourceInfo } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import {
  toShortLoc,
  toSharedText,
  toSourceLoc,
} from "./inspector-shared-model.js";

interface Props {
  readonly found: TextSourceInfo;
}

const SourceTextNote = ({ found }: Props): ReactElement => (
  <div className="ins-data-text wide" role="note">
    <span>
      {copy.edits}
      {found.what} {copy.in}{" "}
      <code data-tip={toSourceLoc(found)}>{toShortLoc(found)}</code>
      {copy.text4}
      {toSharedText(found.shared ?? null)}
    </span>
  </div>
);

export { SourceTextNote };

import type { VersionFileDiff } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { splitHunks } from "../../../shared/hunk.js";
import { COPY } from "./copy.js";
import { HunkBlock } from "./hunk-block.js";
import type { HunkReview } from "./use-hunk-review.js";

const TABLE_ROLE = "table";

interface FilePatchProps {
  readonly file: VersionFileDiff;
  readonly review: HunkReview;
}

const FilePatch = ({ file, review }: FilePatchProps): ReactNode => {
  if (file.binary) {
    return <div className="diff-view compare-code-note">{COPY.codeBinary}</div>;
  }

  const hunks = splitHunks(file.patch);

  if (hunks.length === 0) {
    return (
      <div className="diff-view compare-code-note">{COPY.codeNoLines}</div>
    );
  }

  return (
    <div
      className="diff-view compare-code-view"
      role={TABLE_ROLE}
      aria-label={`Diff of ${file.path}`}
    >
      {hunks.map((hunk) => (
        <HunkBlock key={hunk.index} file={file} hunk={hunk} review={review} />
      ))}
      {file.truncated && <div className="diff-gap">{COPY.codeTruncated}</div>}
    </div>
  );
};

export { FilePatch };

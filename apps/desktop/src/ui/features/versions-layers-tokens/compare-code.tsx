import type { Version } from "@design-studio/contracts";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { OPEN_ALL_MAX } from "./compare-code-model.js";
import { ComparePair } from "./compare-pair.js";
import { CompareSummary } from "./compare-summary.js";
import { COPY } from "./copy.js";
import { FileSection } from "./file-section.js";
import { useChanges } from "./use-changes.js";
import { useHunkReview } from "./use-hunk-review.js";

import "../../styles/compare-code.css";
import "../../styles/compare-hunk.css";

interface CompareCodeProps {
  readonly newer: Version;
  readonly older: Version;
  readonly projectId: string;
}

const CompareCode = ({
  newer,
  older,
  projectId,
}: CompareCodeProps): ReactNode => {
  const state = useChanges(projectId, older.id, newer.id);
  const review = useHunkReview(
    projectId,
    newer.directionId,
    older.id,
    newer.id
  );
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());

  const toggleFile = useCallback((path: string): void => {
    setToggled((previous) => {
      const next = new Set(previous);

      if (!next.delete(path)) {
        next.add(path);
      }

      return next;
    });
  }, []);

  if (!state) {
    return <output className="compare-code-empty">{COPY.codeLoading}</output>;
  }

  if (state.error || !state.changes) {
    return (
      <div className="stage-message" role="alert">
        {state.error ?? COPY.codeLoadFailed}
      </div>
    );
  }

  const { changes } = state;

  if (changes.files.length === 0) {
    return <div className="compare-code-empty">{COPY.codeSameFiles}</div>;
  }

  const isOpenByDefault = changes.files.length <= OPEN_ALL_MAX;

  return (
    <div className="compare-code">
      <ComparePair older={older} newer={newer} />
      <CompareSummary changes={changes} />
      <ul className="compare-code-files">
        {changes.files.map((file) => (
          <FileSection
            key={file.path}
            file={file}
            isOpen={isOpenByDefault !== toggled.has(file.path)}
            onToggle={toggleFile}
            review={review}
          />
        ))}
      </ul>
    </div>
  );
};

export { CompareCode };

import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { CritiqueIssueRow } from "./critique-issue-row.js";
import { toScoreRows } from "./critique-model.js";
import type { CritiqueView } from "./critique-model.js";
import { CritiqueScoreRow } from "./critique-score-row.js";

import styles from "./critique.module.css";

interface ResultProps {
  readonly critique: CritiqueView;
  readonly onSelect: (selector: string) => void;
}

const CritiqueResult = ({ critique, onSelect }: ResultProps): ReactElement => (
  <>
    <ul aria-label={copy.scoreLabel} className={styles.scores}>
      {toScoreRows(critique.scores).map((row) => (
        <CritiqueScoreRow key={row.key} row={row} />
      ))}
    </ul>
    {critique.issues.length === 0 && (
      <p className={styles.empty}>{copy.noIssues}</p>
    )}
    <ul aria-label={copy.issues} className="review-list">
      {critique.issues.map((issue) => (
        <CritiqueIssueRow
          issue={issue}
          key={`${issue.severity}-${issue.message}`}
          onSelect={onSelect}
        />
      ))}
    </ul>
  </>
);

export { CritiqueResult };

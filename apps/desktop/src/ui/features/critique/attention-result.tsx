import type { ReactElement } from "react";

import { AttentionImage } from "./attention-image.js";
import type { AttentionView } from "./attention-model.js";
import { AttentionNoteRow } from "./attention-note-row.js";
import { AttentionRow } from "./attention-row.js";
import { copy } from "./copy.js";

import styles from "./critique.module.css";

interface ResultProps {
  readonly onSelect: (selector: string) => void;
  readonly projectId: string;
  readonly view: AttentionView;
}

const AttentionResult = ({
  onSelect,
  projectId,
  view,
}: ResultProps): ReactElement => (
  <>
    <AttentionImage heatmapPath={view.heatmapPath} projectId={projectId} />
    <div className={styles.clarity}>
      <span className={styles.scoreLabel}>{copy.attention.clarity}</span>
      <span className={styles.clarityValue}>{view.clarityScore}</span>
    </div>
    <ul aria-label={copy.attention.rank} className="review-list">
      {view.topElements.map((element) => (
        <AttentionRow
          element={element}
          key={element.selector}
          onSelect={onSelect}
        />
      ))}
    </ul>
    {view.notes.length === 0 && (
      <p className={styles.empty}>{copy.attention.notesNone}</p>
    )}
    <ul aria-label={copy.attention.notes} className="review-list">
      {view.notes.map((note) => (
        <AttentionNoteRow key={note.kind} note={note} />
      ))}
    </ul>
  </>
);

export { AttentionResult };

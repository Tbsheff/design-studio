import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ChipButton } from "./deps.js";
import { KIND_OPTIONS } from "./dev-note-model.js";
import type { NoteKind } from "./dev-note-model.js";

import styles from "./dev-note.module.css";

interface KindChipsProps {
  readonly kind: NoteKind;
  readonly onPick: (kind: NoteKind) => void;
}

const KindChips = ({ kind, onPick }: KindChipsProps): ReactElement => (
  <fieldset aria-label={copy.kindLabel} className={styles.chips}>
    {KIND_OPTIONS.map((option) => (
      <ChipButton
        isOn={option.kind === kind}
        key={option.kind}
        label={option.label}
        onPick={onPick}
        tip={null}
        value={option.kind}
      />
    ))}
  </fieldset>
);

export { KindChips };

export type { KindChipsProps };

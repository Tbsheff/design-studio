import type { ReactElement } from "react";

import { ChipButton } from "./chip-button.js";
import { copy, EXPAND_LABEL } from "./copy.js";
import { EXPAND_ASPECTS } from "./generate-model.js";
import type { ExpandAspect } from "./generate-model.js";

import styles from "./image-generate.module.css";

interface ExpandChipProps {
  readonly isPending: boolean;
  readonly onPick: (aspect: ExpandAspect) => void;
}

const ExpandChip = ({ isPending, onPick }: ExpandChipProps): ReactElement => (
  <details className={styles.expand}>
    <summary className="btn small ghost">{copy.expand}</summary>
    <fieldset
      aria-label={copy.expandMenu}
      className={styles.chips}
      disabled={isPending}
    >
      {EXPAND_ASPECTS.map((aspect) => (
        <ChipButton
          isOn={false}
          key={aspect}
          label={EXPAND_LABEL[aspect]}
          value={aspect}
          onPick={onPick}
        />
      ))}
    </fieldset>
  </details>
);

export { ExpandChip };

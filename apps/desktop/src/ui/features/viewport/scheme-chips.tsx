import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ChipButton } from "./deps.js";
import { SCHEMES } from "./matrix-model.js";
import type { Scheme } from "./matrix-model.js";

import styles from "./viewport.module.css";

interface SchemeChipsProps {
  readonly onPick: (value: Scheme) => void;
  readonly scheme: Scheme;
}

const SchemeChips = ({ onPick, scheme }: SchemeChipsProps): ReactElement => (
  <fieldset aria-label={copy.schemeLabel} className={styles.chips}>
    {SCHEMES.map((entry) => (
      <ChipButton
        isOn={scheme === entry}
        key={entry}
        label={copy.scheme[entry]}
        onPick={onPick}
        tip={null}
        value={entry}
      />
    ))}
  </fieldset>
);

export { SchemeChips };

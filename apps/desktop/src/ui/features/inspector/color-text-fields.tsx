import type { ReactElement } from "react";

import { ColorTextInput } from "./color-text-input.js";
import { copy } from "./copy.js";
import type { ColorPopupState } from "./use-color-popup.js";
import { useColorText } from "./use-color-text.js";

import styles from "./color-popup.module.css";

const ColorTextFields = ({
  popup,
}: {
  readonly popup: ColorPopupState;
}): ReactElement => {
  const text = useColorText(popup);

  return (
    <div className={styles.fields}>
      <ColorTextInput label={copy.colorHex} field={text.hex} />
      <ColorTextInput label={copy.colorAlpha} field={text.alpha} />
    </div>
  );
};

export { ColorTextFields };

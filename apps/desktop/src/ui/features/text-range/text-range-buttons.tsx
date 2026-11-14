import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { isStyleOn } from "./text-range-model.js";
import type { TextRangeView } from "./use-text-range.js";

import styles from "./text-range.module.css";

interface TextRangeButtonsProps {
  readonly onColorToggle: () => void;
  readonly view: TextRangeView;
}

const toPressed = (isOn: boolean): string => {
  if (isOn) {
    return ` ${styles.pressed}`;
  }

  return "";
};

const TextRangeButtons = ({
  onColorToggle,
  view,
}: TextRangeButtonsProps): ReactElement => {
  const { handleBold, handleItalic, handleLink, isPending } = view;
  const isBold = isStyleOn("bold", view);
  const isItalic = isStyleOn("italic", view);
  const isLink = isStyleOn("link", view);

  return (
    <>
      <button
        aria-label={copy.bold}
        className={`btn small ghost ${styles.glyph} ${styles.bold}${toPressed(isBold)}`}
        data-tip={copy.boldTip}
        disabled={isPending}
        onClick={handleBold}
        type="button"
      >
        {copy.boldGlyph}
      </button>
      <button
        aria-label={copy.italic}
        className={`btn small ghost ${styles.glyph} ${styles.italic}${toPressed(isItalic)}`}
        data-tip={copy.italicTip}
        disabled={isPending}
        onClick={handleItalic}
        type="button"
      >
        {copy.italicGlyph}
      </button>
      <button
        className={`btn small ghost${toPressed(isLink)}`}
        data-tip={copy.linkTip}
        disabled={isPending}
        onClick={handleLink}
        type="button"
      >
        {copy.link}
      </button>
      <span className={styles.divider} />
      <button className="btn small ghost" onClick={onColorToggle} type="button">
        {copy.color}
      </button>
    </>
  );
};

export { TextRangeButtons };

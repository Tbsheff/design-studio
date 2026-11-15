import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { ColorPad } from "./color-pad.js";
import { ColorPageSwatches } from "./color-page-swatches.js";
import { ColorSliders } from "./color-sliders.js";
import { copy } from "./copy.js";
import { useColorControls } from "./use-color-controls.js";
import type { ColorPopupState } from "./use-color-popup.js";

import styles from "./color-popup.module.css";

const toPortalHost = (): HTMLElement => document.body;

const ColorPopup = ({
  popup,
}: {
  readonly popup: ColorPopupState;
}): ReactNode => {
  const controls = useColorControls(popup);
  const { panel, popStyle } = popup;

  return (
    <>
      {createPortal(
        <section
          className={styles.popup}
          ref={panel}
          style={popStyle}
          aria-label={copy.colorPicker}
          data-esc-owner=""
        >
          <ColorPad popup={popup} control={controls.pad} />
          <ColorSliders popup={popup} controls={controls} />
          <ColorPageSwatches popup={popup} />
        </section>,
        toPortalHost()
      )}
    </>
  );
};

export { ColorPopup };

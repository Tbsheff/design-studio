import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PreviewImage } from "./use-preview-image.js";

import styles from "./component-variant.module.css";

interface PreviewFrameProps {
  readonly image: PreviewImage;
  readonly label: string;
}

const PreviewFrame = ({ image, label }: PreviewFrameProps): ReactElement => {
  if (image.state === "ready") {
    return (
      <span className={styles.frame}>
        <img alt={label} className={styles.image} src={image.src} />
      </span>
    );
  }

  if (image.state === "loading") {
    return (
      <span className={styles.frame} aria-busy="true">
        <span className={styles.wait}>{copy.previewLoading}</span>
      </span>
    );
  }

  return (
    <span className={styles.frame}>
      <span className={styles.wait}>{copy.noPreview}</span>
    </span>
  );
};

export { PreviewFrame };

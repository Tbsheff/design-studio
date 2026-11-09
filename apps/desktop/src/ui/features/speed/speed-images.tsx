import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SpeedImageRow } from "./speed-image-row.js";
import type { SpeedImageView } from "./speed-model.js";

import styles from "./speed.module.css";

interface SpeedImagesProps {
  readonly images: readonly SpeedImageView[];
}

const SpeedImages = ({ images }: SpeedImagesProps): ReactElement | null => {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className={styles.images}>
      <span className={styles.imagesName}>{copy.imagesName}</span>
      <ul className="review-list">
        {images.map((image) => (
          <SpeedImageRow key={image.url} image={image} />
        ))}
      </ul>
    </div>
  );
};

export { SpeedImages };

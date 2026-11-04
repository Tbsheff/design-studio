import type { ReactElement } from "react";

import type { ImageSearchHit } from "./deps.js";
import { licenseOf, thumbOf } from "./image-search-model.js";

import styles from "./image-search.module.css";

interface PhotoThumbProps {
  readonly hit: ImageSearchHit;
}

const PhotoThumb = ({ hit }: PhotoThumbProps): ReactElement => (
  <span className={styles.frame}>
    <img
      alt=""
      className={styles.thumb}
      decoding="async"
      loading="lazy"
      referrerPolicy="no-referrer"
      src={thumbOf(hit)}
    />
    <span className={styles.license}>{licenseOf(hit)}</span>
  </span>
);

export { PhotoThumb };

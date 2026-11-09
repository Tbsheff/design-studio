import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toBytesText, toImageName } from "./speed-model.js";
import type { SpeedImageView } from "./speed-model.js";

import styles from "./speed.module.css";

interface SpeedImageRowProps {
  readonly image: SpeedImageView;
}

const SpeedImageRow = ({ image }: SpeedImageRowProps): ReactElement => (
  <li className={styles.row}>
    <span className={`truncate ${styles.name}`} data-tip={image.url}>
      {toImageName(image)}
      {image.isNew && <span className={styles.tag}>{copy.newImage}</span>}
    </span>
    <span className={`num ${styles.value}`}>{toBytesText(image.bytes)}</span>
  </li>
);

export { SpeedImageRow };

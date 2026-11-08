import type { ReactElement } from "react";

import styles from "./impact.module.css";

interface ImpactThumbProps {
  readonly label: string;
  readonly src: string | null;
}

const ImpactThumb = ({ label, src }: ImpactThumbProps): ReactElement | null => {
  if (src === null) {
    return null;
  }

  return (
    <figure className={styles.thumb}>
      <img alt={label} className={styles.image} src={src} />
      <figcaption className={styles.caption}>{label}</figcaption>
    </figure>
  );
};

export { ImpactThumb };

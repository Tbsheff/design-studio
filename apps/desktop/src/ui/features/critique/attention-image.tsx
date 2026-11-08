import type { ReactElement } from "react";

import { toHeatmapFilePath } from "./attention-model.js";
import { copy } from "./copy.js";
import { useAttentionImage } from "./use-attention-image.js";

import styles from "./critique.module.css";

interface ImageProps {
  readonly heatmapPath: string;
  readonly projectId: string;
}

const AttentionImage = ({
  heatmapPath,
  projectId,
}: ImageProps): ReactElement => {
  const { url } = useAttentionImage(projectId, toHeatmapFilePath(heatmapPath));

  if (url === null) {
    return <div aria-hidden="true" className={styles.heatmapEmpty} />;
  }

  return (
    <img alt={copy.attention.heatmap} className={styles.heatmap} src={url} />
  );
};

export { AttentionImage };

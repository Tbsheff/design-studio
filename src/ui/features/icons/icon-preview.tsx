import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import styles from "./icons.module.css";

interface IconPreviewProps {
  readonly svg: string;
}

const maskOf = (svg: string): CSSProperties => {
  const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  return { WebkitMaskImage: mask, maskImage: mask };
};

const IconPreview = ({ svg }: IconPreviewProps): ReactElement => {
  const style = useMemo(() => maskOf(svg), [svg]);

  return <span aria-hidden="true" className={styles.glyph} style={style} />;
};

export { IconPreview };

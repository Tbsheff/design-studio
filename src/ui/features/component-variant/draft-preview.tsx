import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PreviewFrame } from "./preview-frame.js";
import { usePreviewImage } from "./use-preview-image.js";
import type { PreviewIds } from "./use-preview-image.js";

import styles from "./component-variant.module.css";

interface DraftPreviewProps {
  readonly classes: string;
  readonly file: string;
  readonly from: string;
  readonly ids: PreviewIds;
  readonly name: string;
  readonly prop: string;
}

const DRAFT_DELAY_MS = 400;

const DraftPreview = (props: DraftPreviewProps): ReactElement => {
  const { classes, from, ids, prop } = props;

  const query = useMemo(() => {
    let className: string | null = null;

    if (classes.trim() !== "") {
      className = classes.trim();
    }

    return {
      className,
      file: props.file,
      key: prop,
      name: props.name,
      value: from,
    };
  }, [classes, props.file, from, props.name, prop]);

  const image = usePreviewImage(ids, query, DRAFT_DELAY_MS);

  return (
    <section className={styles.draft} aria-label={copy.draft}>
      <span className={styles.label}>{copy.draft}</span>
      <PreviewFrame image={image} label={copy.draft} />
      <p className={styles.note}>{copy.draftNote}</p>
    </section>
  );
};

export { DraftPreview };

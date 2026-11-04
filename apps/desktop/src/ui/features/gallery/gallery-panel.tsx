import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { GalleryCell } from "./gallery-cell.js";
import { isFailing } from "./gallery-model.js";
import { useGallery } from "./use-gallery.js";
import type { GallerySetup } from "./use-gallery.js";

import styles from "./gallery.module.css";

interface GalleryPanelProps extends GallerySetup {
  readonly onClose: () => void;
}

const GalleryPanel = ({
  onClose,
  ...setup
}: GalleryPanelProps): ReactElement => {
  const gallery = useGallery(setup);
  const failing = gallery.cells.filter((cell) => isFailing(cell)).length;
  let buildLabel: string = copy.build;

  if (gallery.isBusy) {
    buildLabel = copy.building;
  }

  return (
    <section aria-label={copy.title} className={styles.panel}>
      <div className={styles.actions}>
        <strong className={styles.title}>{setup.component}</strong>
        <button
          className={styles.primary}
          disabled={gallery.isBusy}
          onClick={gallery.handleBuild}
          type="button"
        >
          {buildLabel}
        </button>
        <button className={styles.secondary} onClick={onClose} type="button">
          {copy.close}
        </button>
      </div>
      <span className={styles.error} role="alert">
        {gallery.error}
      </span>
      {gallery.cells.length === 0 && (
        <span className={styles.note}>{copy.empty}</span>
      )}
      {failing > 0 && (
        <span className={styles.note}>{`${copy.failures}: ${failing}`}</span>
      )}
      <div className={styles.grid}>
        {gallery.cells.map((cell) => (
          <GalleryCell
            cell={cell}
            isSelected={gallery.selected?.id === cell.id}
            key={cell.id}
            onSelect={gallery.handleSelect}
          />
        ))}
      </div>
      {gallery.selected !== null && setup.target !== null && (
        <button
          className={styles.primary}
          disabled={gallery.isBusy}
          onClick={gallery.handleAdopt}
          type="button"
        >
          {copy.adopt}
        </button>
      )}
      {gallery.applied && <span className={styles.note}>{copy.used}</span>}
    </section>
  );
};

export { GalleryPanel };

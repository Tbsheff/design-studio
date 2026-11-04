import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ImageSearchHit } from "./deps.js";
import { PhotoCard } from "./photo-card.js";
import type { PhotoPlace } from "./use-image-place.js";

import styles from "./image-search.module.css";

interface PhotoGridProps {
  readonly hits: readonly ImageSearchHit[] | null;
  readonly isPending: boolean;
  readonly place: PhotoPlace;
}

const PhotoGrid = ({
  hits,
  isPending,
  place,
}: PhotoGridProps): ReactElement | null => {
  if (isPending && hits === null) {
    return <p className={styles.note}>{copy.loading}</p>;
  }

  if (hits === null) {
    return null;
  }

  if (hits.length === 0) {
    return <p className={styles.note}>{copy.empty}</p>;
  }

  return (
    <ul aria-label={copy.grid} className={styles.grid}>
      {hits.map((hit) => (
        <PhotoCard
          hit={hit}
          isDisabled={place.isPlacing}
          isPlacing={place.placingId === hit.id}
          key={hit.id}
          onPlace={place.handlePlace}
        />
      ))}
    </ul>
  );
};

export { PhotoGrid };

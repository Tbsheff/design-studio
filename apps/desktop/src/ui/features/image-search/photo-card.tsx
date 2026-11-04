import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ImageSearchHit } from "./deps.js";
import { authorOf } from "./image-search-model.js";
import { PhotoThumb } from "./photo-thumb.js";

import styles from "./image-search.module.css";

interface PhotoCardProps {
  readonly hit: ImageSearchHit;
  readonly isDisabled: boolean;
  readonly isPlacing: boolean;
  readonly onPlace: (hit: ImageSearchHit) => void;
}

const titleOf = (hit: ImageSearchHit): string =>
  `${hit.title ?? copy.grid}, ${copy.author} ${authorOf(hit)}`;

const authorText = (hit: ImageSearchHit, isPlacing: boolean): string => {
  if (isPlacing) {
    return copy.placing;
  }

  return authorOf(hit);
};

const PhotoCard = ({
  hit,
  isDisabled,
  isPlacing,
  onPlace,
}: PhotoCardProps): ReactElement => {
  const handlePlace = useCallback((): void => {
    onPlace(hit);
  }, [hit, onPlace]);

  return (
    <li>
      <button
        aria-busy={isPlacing}
        aria-label={titleOf(hit)}
        className={styles.card}
        data-tip={titleOf(hit)}
        disabled={isDisabled}
        type="button"
        onClick={handlePlace}
      >
        <PhotoThumb hit={hit} />
        <span className={styles.author}>{authorText(hit, isPlacing)}</span>
      </button>
    </li>
  );
};

export { PhotoCard };

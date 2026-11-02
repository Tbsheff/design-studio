import { useCallback, useId, useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import type { PhotoIds } from "./image-search-api.js";
import { SearchBody } from "./search-body.js";
import { SheetFoot } from "./sheet-foot.js";
import { SheetHead } from "./sheet-head.js";
import { useImagePlace } from "./use-image-place.js";
import { useImageSearch } from "./use-image-search.js";

import styles from "./image-search.module.css";

interface ImageSearchSheetProps {
  readonly directionId: string;
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
  readonly target: SelectionContext;
}

const ImageSearchSheet = (props: ImageSearchSheetProps): ReactElement => {
  const { directionId, onClose, onDone, projectId, target } = props;
  const hintId = useId();

  const ids: PhotoIds = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const search = useImageSearch(ids);
  const { query } = search;
  const place = useImagePlace({ ids, onDone, query, target });
  const { isPlacing } = place;

  const handleDismiss = useCallback((): boolean => {
    if (isPlacing) {
      return false;
    }

    onClose();

    return true;
  }, [isPlacing, onClose]);

  const { ref } = useModalDialog(handleDismiss);

  return (
    <dialog
      aria-describedby={hintId}
      aria-label={copy.find}
      className={`modal ${styles.dialog}`}
      ref={ref}
    >
      <div className="modal-form">
        <SheetHead hintId={hintId} target={target} />
        <SearchBody place={place} search={search} />
        <SheetFoot isPlacing={isPlacing} onClose={onClose} />
      </div>
    </dialog>
  );
};

export { ImageSearchSheet };

export type { ImageSearchSheetProps };

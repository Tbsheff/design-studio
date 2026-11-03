import { useCallback, useId, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import type { RenderGenerate } from "./generate-tab.js";
import type { PhotoIds } from "./image-search-api.js";
import { SearchBody } from "./search-body.js";
import { SheetFoot } from "./sheet-foot.js";
import { SheetHead } from "./sheet-head.js";
import { SheetTabs } from "./sheet-tabs.js";
import type { SheetTab } from "./sheet-tabs.js";
import { useImagePlace } from "./use-image-place.js";
import { useImageSearch } from "./use-image-search.js";

import styles from "./image-search.module.css";

interface ImageSearchSheetProps {
  readonly renderGenerate?: RenderGenerate | undefined;
  readonly directionId: string;
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
  readonly target: SelectionContext;
}

const ImageSearchSheet = (props: ImageSearchSheetProps): ReactElement => {
  const { directionId, onClose, onDone, projectId, renderGenerate, target } =
    props;

  const [tab, setTab] = useState<SheetTab>("search");
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

  let body = <SearchBody place={place} search={search} />;

  if (tab === "generate" && renderGenerate) {
    body = (
      <div className="modal-body">
        {renderGenerate({ directionId, onDone, projectId, target })}
      </div>
    );
  }

  return (
    <dialog
      aria-describedby={hintId}
      aria-label={copy.find}
      className={`modal ${styles.dialog}`}
      ref={ref}
    >
      <div className="modal-form">
        <SheetHead hintId={hintId} target={target} />
        {renderGenerate && <SheetTabs tab={tab} onPick={setTab} />}
        {body}
        <SheetFoot isPlacing={isPlacing} onClose={onClose} />
      </div>
    </dialog>
  );
};

export { ImageSearchSheet };

export type { ImageSearchSheetProps };

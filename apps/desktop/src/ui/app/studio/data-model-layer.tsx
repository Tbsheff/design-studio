import { Suspense, useCallback } from "react";
import type { ReactNode } from "react";

import { DataModelDialog } from "../../features/data-model/index.js";
import { useLive } from "../../platform/live-store.js";
import { sampleDataDialog } from "../../platform/sample-data-dialog.js";
import type { DraftStore } from "../../platform/storage.js";

interface DataModelLayerProps {
  draft: DraftStore;
}

const toInsertedDraft = (draft: string, text: string): string => {
  if (draft === "" || /\s$/u.test(draft)) {
    return `${draft}${text}`;
  }

  return `${draft} ${text}`;
};

const DataModelLayer = ({ draft }: DataModelLayerProps): ReactNode => {
  const isOpen = useLive(sampleDataDialog);

  const handleInsert = useCallback(
    (text: string): void => {
      draft.set(toInsertedDraft(draft.get(), text));
    },
    [draft]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <DataModelDialog onInsert={handleInsert} />
    </Suspense>
  );
};

export { DataModelLayer };

import type { InsertKind, SelectionContext } from "@design-studio/contracts";
import { startTransition, useCallback, useState } from "react";
import type { MutableRefObject } from "react";

import { api, errorText } from "../../api.js";
import type { DirectEditControl } from "./use-direct-edit.js";

interface InsertOptions {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly last: SelectionContext | null;
  readonly control: MutableRefObject<DirectEditControl | null>;
}

interface InsertState {
  readonly notice: string | null;
  readonly handleInsert: (kind: InsertKind) => void;
}

const useInsertTool = (options: InsertOptions): InsertState => {
  const { projectId, directionId, last, control } = options;
  const [notice, setNotice] = useState<string | null>(null);

  const handleInsert = useCallback(
    (kind: InsertKind): void => {
      const source = last?.source ?? null;

      if (!directionId || !last || !source) {
        return;
      }

      const { selector, tag } = last;

      setNotice(null);

      startTransition(async () => {
        try {
          await control.current?.settle();
          await api.directEdit(projectId, directionId, {
            insert: kind,
            selector,
            source,
            tag,
          });
        } catch (error) {
          setNotice(errorText(error));
        }
      });
    },
    [control, directionId, last, projectId]
  );

  return { handleInsert, notice };
};

export { useInsertTool };

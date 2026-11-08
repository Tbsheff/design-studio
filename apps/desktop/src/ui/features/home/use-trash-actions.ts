import type { TrashItem } from "@design-studio/contracts";
import { useCallback, useState } from "react";
import type { RefObject } from "react";

import { api, errorText } from "../../api.js";
import { useTrashConfirm } from "./use-trash-confirm.js";
import type { TrashConfirm } from "./use-trash-confirm.js";
import type { TrashList } from "./use-trash-list.js";

interface TrashActionDeps {
  readonly list: TrashList;
  readonly onRestored: () => void;
  readonly firstRestoreRef: RefObject<HTMLButtonElement | null>;
  readonly doneRef: RefObject<HTMLButtonElement | null>;
}

interface TrashActions extends TrashConfirm {
  readonly busy: string | null;
  readonly note: string;
  readonly restore: (item: TrashItem) => void;
}

const useTrashActions = ({
  list,
  onRestored,
  firstRestoreRef,
  doneRef,
}: TrashActionDeps): TrashActions => {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const { dropItem, setMessage } = list;

  const refocus = useCallback((): void => {
    globalThis.requestAnimationFrame(() =>
      (firstRestoreRef.current ?? doneRef.current)?.focus()
    );
  }, [doneRef, firstRestoreRef]);

  const confirmation = useTrashConfirm({ list, refocus, setBusy, setNote });

  const restore = useCallback(
    (item: TrashItem): void => {
      const run = async (): Promise<void> => {
        setBusy(item.trashId);
        setMessage(null);

        try {
          await api.restoreProject(item.trashId);
          dropItem(item.trashId);
          setNote(`Restored “${item.name}”.`);
          onRestored();
          refocus();
        } catch (error) {
          setMessage(`Could not restore “${item.name}”: ${errorText(error)}`);
        }

        setBusy(null);
      };

      void run();
    },
    [dropItem, onRestored, refocus, setMessage]
  );

  return { ...confirmation, busy, note, restore };
};

export { useTrashActions };

export type { TrashActions };

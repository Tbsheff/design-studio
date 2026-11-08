import type { TrashItem } from "@design-studio/contracts";
import { useCallback, useState } from "react";

import { errorText } from "../../api.js";
import { toDeletedNote } from "./trash-model.js";
import type { Confirm } from "./trash-model.js";
import { trashApi } from "./use-trash-api.js";
import type { TrashList } from "./use-trash-list.js";

interface TrashConfirmDeps {
  readonly list: TrashList;
  readonly setBusy: (busy: string | null) => void;
  readonly setNote: (note: string) => void;
  readonly refocus: () => void;
}

interface TrashConfirm {
  readonly confirm: Confirm | null;
  readonly confirmError: string | null;
  readonly askOne: (item: TrashItem) => void;
  readonly askAll: (count: number, shouldFolderStay: boolean) => void;
  readonly cancelConfirm: () => void;
  readonly confirmDelete: () => void;
}

const useTrashConfirm = ({
  list,
  setBusy,
  setNote,
  refocus,
}: TrashConfirmDeps): TrashConfirm => {
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const { dropItem, setItems } = list;

  const askOne = useCallback((item: TrashItem): void => {
    setConfirmError(null);
    setConfirm({ item, kind: "one" });
  }, []);

  const askAll = useCallback(
    (total: number, isFolderStaying: boolean): void => {
      setConfirmError(null);
      setConfirm({
        count: total,
        kind: "all",
        shouldFolderStay: isFolderStaying,
      });
    },
    []
  );

  const cancelConfirm = useCallback((): void => {
    setConfirm(null);
  }, []);

  const confirmDelete = useCallback((): void => {
    if (!confirm) {
      return;
    }

    const run = async (): Promise<void> => {
      setBusy("confirm");
      setConfirmError(null);

      try {
        if (confirm.kind === "one") {
          await trashApi.remove(confirm.item.trashId);
          dropItem(confirm.item.trashId);
          setNote(`Deleted “${confirm.item.name}” forever.`);
        } else {
          const { deleted } = await trashApi.empty();
          setItems([]);
          setNote(toDeletedNote(deleted));
        }

        setConfirm(null);
        refocus();
      } catch (error) {
        setConfirmError(errorText(error));
      }

      setBusy(null);
    };

    void run();
  }, [confirm, dropItem, refocus, setBusy, setItems, setNote]);

  return {
    askAll,
    askOne,
    cancelConfirm,
    confirm,
    confirmDelete,
    confirmError,
  };
};

export { useTrashConfirm };

export type { TrashConfirm };

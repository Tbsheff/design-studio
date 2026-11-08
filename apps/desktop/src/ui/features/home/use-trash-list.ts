import type { TrashItem } from "@design-studio/contracts";
import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { errorText } from "../../api.js";
import { trashApi } from "./use-trash-api.js";

interface TrashList {
  readonly items: TrashItem[] | null;
  readonly message: string | null;
  readonly setItems: Dispatch<SetStateAction<TrashItem[] | null>>;
  readonly setMessage: (message: string | null) => void;
  readonly reload: () => void;
  readonly dropItem: (trashId: string) => void;
}

const useTrashList = (): TrashList => {
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const read = useCallback(async (): Promise<void> => {
    try {
      setItems(await trashApi.list());
    } catch (error) {
      setMessage(errorText(error));
    }
  }, []);

  useEffect(() => {
    queueMicrotask(read);
  }, [read]);

  const reload = useCallback((): void => {
    setMessage(null);
    void read();
  }, [read]);

  const dropItem = useCallback((trashId: string): void => {
    setItems((list) => {
      if (!list) {
        return list;
      }

      return list.filter((entry) => entry.trashId !== trashId);
    });
  }, []);

  return { dropItem, items, message, reload, setItems, setMessage };
};

export { useTrashList };

export type { TrashList };

import { useMemo } from "react";

import {
  insertItems,
  isNeedleMatch,
  toPlainItems,
} from "./components-panel-model.js";
import type { Item } from "./components-panel-model.js";
import type { Props } from "./components-panel-props.js";
import { useInsertable } from "./use-insertable.js";

interface ComponentItems {
  all: Item[] | null;
  error: string | null;
  retry: (() => void) | undefined;
  shown: Item[];
}

const useComponentItems = (
  props: Props,
  canInsert: boolean,
  query: string
): ComponentItems => {
  const insertable = useInsertable(
    props.projectId,
    props.directionId,
    canInsert && props.active,
    props.list.version
  );

  const allItems = useMemo<Item[] | null>(() => {
    if (!canInsert) {
      return toPlainItems(props.list.components);
    }

    if (!insertable.list) {
      return null;
    }

    return insertItems(insertable.list.components, props.list.components ?? []);
  }, [canInsert, insertable.list, props.list.components]);

  const shownItems = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return (allItems ?? []).filter((item) => isNeedleMatch(item, needle));
  }, [allItems, query]);

  if (canInsert) {
    return {
      all: allItems,
      error: insertable.error,
      retry: insertable.retry,
      shown: shownItems,
    };
  }

  return {
    all: allItems,
    error: props.list.error,
    retry: props.list.retry,
    shown: shownItems,
  };
};

export { useComponentItems };

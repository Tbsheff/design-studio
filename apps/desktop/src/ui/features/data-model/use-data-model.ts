import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import { FIELD_LIMIT, LIST_LIMIT, SAMPLE_ROWS } from "./data-model-model.js";
import type { DataModelVariant } from "./data-model-model.js";
import { dataModelRoutes, useAction } from "./deps.js";
import type { RouteOutput } from "./deps.js";

type ModelList = RouteOutput<typeof dataModelRoutes.listDataModel>;

type ModelDetail = RouteOutput<typeof dataModelRoutes.getDataModel>;

interface DataModelState {
  readonly detail: ModelDetail | null;
  readonly error: string | null;
  readonly handlePick: (name: string) => void;
  readonly handleSearch: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleVariant: (variant: DataModelVariant) => void;
  readonly items: ModelList["items"];
  readonly draft: string;
  readonly selected: string | null;
  readonly variant: DataModelVariant;
}

const toMessage = (error: Error | null): string | null => {
  if (error === null) {
    return null;
  }

  return error.message;
};

const useDataModel = (projectId: string): DataModelState => {
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [variant, setVariant] = useState<DataModelVariant>("filled");
  const query = useDeferredValue(draft);

  const listInput = useMemo(() => {
    const cursor = null;
    const limit = LIST_LIMIT;

    return { cursor, limit, projectId, query };
  }, [projectId, query]);

  const getInput = useMemo(() => {
    if (selected === null) {
      return null;
    }

    const limit = FIELD_LIMIT;
    const rows = SAMPLE_ROWS;
    const seed = 1;

    const model = selected;

    return { limit, model, projectId, rows, seed, variant };
  }, [projectId, selected, variant]);

  const list = useAction(dataModelRoutes.listDataModel, listInput);
  const get = useAction(dataModelRoutes.getDataModel, getInput);
  const detail = get.data;
  const items = list.data?.items ?? [];
  const error = toMessage(list.error ?? get.error);
  const handlePick = setSelected;
  const handleVariant = setVariant;

  const handleSearch = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value);
    },
    []
  );

  return {
    detail,
    draft,
    error,
    handlePick,
    handleSearch,
    handleVariant,
    items,
    selected,
    variant,
  };
};

export { useDataModel };

export type { DataModelState };

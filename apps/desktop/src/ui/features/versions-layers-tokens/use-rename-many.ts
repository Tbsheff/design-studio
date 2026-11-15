import type { LayerNode } from "@design-studio/contracts";
import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";

import { editableName } from "./layers-tree.js";
import {
  RENAME_MANY_MAX,
  toPatternNames,
  toPatternPreview,
} from "./rename-pattern-model.js";
import type { PatternPreview } from "./rename-pattern-model.js";

type RenameMany = (ids: number[], names: (string | null)[]) => void;

type InputChange = (event: ChangeEvent<HTMLInputElement>) => void;

interface RenameManyInput {
  readonly nodes: LayerNode[];
  readonly onRenameMany: RenameMany | null;
  readonly selectedNodes: ReadonlySet<number>;
}

interface RenameFields {
  readonly find: string;
  readonly handleFindChange: InputChange;
  readonly handlePatternChange: InputChange;
  readonly handleReplaceChange: InputChange;
  readonly pattern: string;
  readonly replace: string;
  readonly reset: () => void;
}

interface RenameManyApi {
  readonly canOpen: boolean;
  readonly close: () => void;
  readonly fields: RenameFields;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly isOpen: boolean;
  readonly isTooMany: boolean;
  readonly open: () => void;
  readonly preview: PatternPreview;
}

interface RenamePlan {
  readonly ids: number[];
  readonly names: (string | null)[];
  readonly preview: PatternPreview;
}

const DEFAULT_PATTERN = "$&";

const toNullName = (name: string): string | null => {
  if (name === "") {
    return null;
  }

  return name;
};

const toRenamePlan = (
  ordered: readonly LayerNode[],
  fields: RenameFields
): RenamePlan => {
  const current = ordered.map((node) => editableName(node.name));
  const { find, pattern, replace } = fields;
  const next = toPatternNames(current, pattern, find, replace);
  const ids: number[] = [];
  const names: (string | null)[] = [];

  for (const [index, node] of ordered.entries()) {
    const name = next[index] ?? "";

    if (name !== current[index]) {
      ids.push(node.id);
      names.push(toNullName(name));
    }
  }

  const preview = toPatternPreview(
    ordered.map((node) => node.id),
    next
  );

  return { ids, names, preview };
};

const useInputValue = (initial: string): [string, InputChange, () => void] => {
  const [value, setValue] = useState(initial);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setValue(event.target.value);
    },
    []
  );

  const reset = useCallback((): void => {
    setValue(initial);
  }, [initial]);

  return [value, handleChange, reset];
};

const useRenameFields = (): RenameFields => {
  const [pattern, handlePatternChange, resetPattern] =
    useInputValue(DEFAULT_PATTERN);

  const [find, handleFindChange, resetFind] = useInputValue("");
  const [replace, handleReplaceChange, resetReplace] = useInputValue("");

  const reset = useCallback((): void => {
    resetPattern();
    resetFind();
    resetReplace();
  }, [resetFind, resetPattern, resetReplace]);

  return useMemo(
    () => ({
      find,
      handleFindChange,
      handlePatternChange,
      handleReplaceChange,
      pattern,
      replace,
      reset,
    }),
    [
      find,
      handleFindChange,
      handlePatternChange,
      handleReplaceChange,
      pattern,
      replace,
      reset,
    ]
  );
};

const useRenameMany = (input: RenameManyInput): RenameManyApi => {
  const { nodes, onRenameMany, selectedNodes } = input;
  const [isRequested, setIsRequested] = useState(false);
  const fields = useRenameFields();
  const { reset } = fields;

  const ordered = useMemo(
    () => nodes.filter((node) => selectedNodes.has(node.id)),
    [nodes, selectedNodes]
  );

  const plan = useMemo(() => toRenamePlan(ordered, fields), [fields, ordered]);
  const isTooMany = ordered.length > RENAME_MANY_MAX;
  const canOpen = onRenameMany !== null && ordered.length > 1;
  const isOpen = isRequested && canOpen;
  const { preview } = plan;

  const open = useCallback((): void => {
    reset();
    setIsRequested(true);
  }, [reset]);

  const close = useCallback((): void => {
    setIsRequested(false);
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (isTooMany || !onRenameMany) {
        return;
      }

      setIsRequested(false);

      if (plan.ids.length > 0) {
        onRenameMany(plan.ids, plan.names);
      }
    },
    [isTooMany, onRenameMany, plan]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      event.stopPropagation();

      if (event.key === "Escape") {
        event.preventDefault();
        setIsRequested(false);
      }
    },
    []
  );

  return {
    canOpen,
    close,
    fields,
    handleKeyDown,
    handleSubmit,
    isOpen,
    isTooMany,
    open,
    preview,
  };
};

export { useRenameMany };

export type { RenameMany, RenameManyApi };

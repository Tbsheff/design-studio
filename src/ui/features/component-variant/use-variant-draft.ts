import { useCallback, useMemo, useState, useTransition } from "react";

import { insertError, propsApi } from "./deps.js";
import type { ComponentVariantChange } from "./deps.js";
import {
  changeOf,
  initialDraft,
  nameStateOf,
  optionOf,
  targetOf,
} from "./variant-model.js";
import type {
  NameState,
  VariantDraft,
  VariantSheetProps,
} from "./variant-model.js";

interface VariantDraftState {
  readonly change: ComponentVariantChange | null;
  readonly draft: VariantDraft;
  readonly error: string | null;
  readonly handleClassesEdit: (classes: string) => void;
  readonly handleDefaultToggle: () => void;
  readonly handleNameEdit: (name: string) => void;
  readonly handlePick: (value: string) => void;
  readonly handleSave: () => void;
  readonly handleUseToggle: () => void;
  readonly isPending: boolean;
  readonly nameState: NameState;
}

interface DraftFields {
  readonly draft: VariantDraft;
  readonly handleClassesEdit: (classes: string) => void;
  readonly handleDefaultToggle: () => void;
  readonly handleNameEdit: (name: string) => void;
  readonly handlePick: (value: string) => void;
  readonly handleUseToggle: () => void;
}

const useDraftFields = (props: VariantSheetProps): DraftFields => {
  const { current, group, mode } = props;

  const [draft, setDraft] = useState<VariantDraft>(() =>
    initialDraft(group, mode, current)
  );

  const handlePick = useCallback(
    (value: string): void => {
      const option = optionOf(group, value);
      let classes = "";

      if (option?.editable) {
        ({ classes } = option);
      }

      setDraft((last) => {
        if (mode === "edit") {
          return { ...last, classes, from: value, name: value };
        }

        return { ...last, classes, from: value };
      });
    },
    [group, mode]
  );

  const handleNameEdit = useCallback((name: string): void => {
    setDraft((last) => ({ ...last, name }));
  }, []);

  const handleClassesEdit = useCallback((classes: string): void => {
    setDraft((last) => ({ ...last, classes }));
  }, []);

  const handleDefaultToggle = useCallback((): void => {
    setDraft((last) => ({ ...last, setDefault: !last.setDefault }));
  }, []);

  const handleUseToggle = useCallback((): void => {
    setDraft((last) => ({
      ...last,
      shouldUseOnSelected: !last.shouldUseOnSelected,
    }));
  }, []);

  return {
    draft,
    handleClassesEdit,
    handleDefaultToggle,
    handleNameEdit,
    handlePick,
    handleUseToggle,
  };
};

const useVariantDraft = (props: VariantSheetProps): VariantDraftState => {
  const { component, directionId, group, mode, onSaved, projectId } = props;
  const fields = useDraftFields(props);
  const { draft } = fields;
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pendingChange = useMemo(
    () => changeOf(group, mode, draft),
    [group, mode, draft]
  );

  const saveDraft = useCallback((): void => {
    const { cva } = component;

    if (!pendingChange || !cva) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await propsApi.writeVariant(
          projectId,
          directionId,
          targetOf(component, cva),
          pendingChange
        );

        setProblem(null);
        onSaved({
          key: result.key,
          shouldUseOnSelected: draft.shouldUseOnSelected,
          title: result.title,
          value: result.value,
        });
      } catch (error) {
        setProblem(insertError(error));
      }
    });
  }, [
    pendingChange,
    component,
    directionId,
    draft.shouldUseOnSelected,
    onSaved,
    projectId,
  ]);

  return {
    ...fields,
    change: pendingChange,
    error: problem,
    handleSave: saveDraft,
    isPending: pending,
    nameState: nameStateOf(group, mode, draft),
  };
};

export { useVariantDraft };

export type { VariantDraftState };

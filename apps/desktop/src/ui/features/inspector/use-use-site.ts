import type { SelectionContext, SourceLoc } from "@design-studio/contracts";
import { sharedSourceOf } from "@design-studio/contracts/app";
import type { SharedSource } from "@design-studio/contracts/app";
import { useState } from "react";

import type { InspectorProps } from "./inspector-model.js";
import { useElementClasses } from "./use-element-classes.js";

interface UseUseSiteResult {
  readonly isEditingUse: boolean;
  readonly effective: SelectionContext | undefined;
  readonly sharedEditing: {
    readonly isEditingUse: boolean;
    readonly onToggle: () => void;
    readonly shared: SharedSource;
  } | null;
}

interface UseSource {
  readonly component: string;
  readonly source: SourceLoc;
}

const toSharedSource = (
  target: SelectionContext | undefined,
  appDir: InspectorProps["appDir"]
): SharedSource | null => {
  if (target && appDir) {
    return sharedSourceOf(target, appDir);
  }

  return null;
};

const toUse = (shared: SharedSource | null): UseSource | null => {
  if (shared?.use && shared.name) {
    return { component: shared.name, source: shared.use };
  }

  return null;
};

const toUseSource = (
  use: UseSource | null,
  target: SelectionContext | undefined
): SourceLoc | null => {
  if (use) {
    return target?.source ?? null;
  }

  return null;
};

const toEffective = (
  target: SelectionContext | undefined,
  use: UseSource | null,
  isEditingUse: boolean
): SelectionContext | undefined => {
  if (target && use && isEditingUse) {
    return { ...target, ...use, usedAt: null };
  }

  return target;
};

const toToggled = (
  isEditingUse: boolean,
  target: SelectionContext | undefined
): string | null => {
  if (isEditingUse) {
    return target?.selector ?? null;
  }

  return null;
};

const useUseSite = (props: InspectorProps): UseUseSiteResult => {
  const [componentFor, setComponentFor] = useState<string | null>(null);
  const target = props.selection.length === 1 ? props.selection[0] : undefined;

  const shared = toSharedSource(target, props.appDir);
  const use = toUse(shared);

  const component = useElementClasses({
    directionId: props.directionId,
    projectId: props.projectId,
    savedAt: 0,
    source: toUseSource(use, target),
    variant: "",
  });

  const editingUse =
    Boolean(use) &&
    component.element?.forwardsClassName !== false &&
    componentFor !== target?.selector;

  const effective = toEffective(target, use, editingUse);
  const toggle = (): void => setComponentFor(toToggled(editingUse, target));

  return {
    effective,
    isEditingUse: editingUse,
    sharedEditing: shared
      ? { isEditingUse: editingUse, onToggle: toggle, shared }
      : null,
  };
};

export { useUseSite };

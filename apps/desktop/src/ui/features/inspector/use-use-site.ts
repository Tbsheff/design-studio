import type { SelectionContext, SourceLoc } from "@design-studio/contracts";
import { sharedSourceOf } from "@design-studio/contracts/app";
import type { SharedSource } from "@design-studio/contracts/app";
import { useState } from "react";

import { useElementClasses } from "./inspector-classes.js";
import type { InspectorProps } from "./inspector-model.js";

interface UseUseSiteResult {
  readonly isEditingUse: boolean;
  readonly effective: SelectionContext | null;
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
  target: SelectionContext | null,
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
  target: SelectionContext | null
): SourceLoc | null => {
  if (use) {
    return target?.source ?? null;
  }

  return null;
};

const toEffective = (
  target: SelectionContext | null,
  use: UseSource | null,
  isEditingUse: boolean
): SelectionContext | null => {
  if (target && use && isEditingUse) {
    return { ...target, ...use, usedAt: null };
  }

  return target;
};

const toToggled = (
  isEditingUse: boolean,
  target: SelectionContext | null
): string | null => {
  if (isEditingUse) {
    return target?.selector ?? null;
  }

  return null;
};

const toSingleTarget = (
  selection: InspectorProps["selection"]
): SelectionContext | null => {
  if (selection.length === 1) {
    return selection[0] ?? null;
  }

  return null;
};

const toSharedEditing = (
  shared: SharedSource | null,
  isEditingUse: boolean,
  onToggle: () => void
): UseUseSiteResult["sharedEditing"] => {
  if (shared) {
    return { isEditingUse, onToggle, shared };
  }

  return null;
};

const useUseSite = (props: InspectorProps): UseUseSiteResult => {
  const [componentFor, setComponentFor] = useState<string | null>(null);
  const target = toSingleTarget(props.selection);

  const shared = toSharedSource(target, props.appDir);
  const use = toUse(shared);

  const component = useElementClasses(
    props.projectId,
    props.directionId,
    toUseSource(use, target),
    0
  );

  const editingUse =
    Boolean(use) &&
    component.element?.forwardsClassName !== false &&
    componentFor !== target?.selector;

  const effective = toEffective(target, use, editingUse);
  const toggle = (): void => setComponentFor(toToggled(editingUse, target));

  return {
    effective,
    isEditingUse: editingUse,
    sharedEditing: toSharedEditing(shared, editingUse, toggle),
  };
};

export { useUseSite };

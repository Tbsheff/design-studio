import type { SelectionContext } from "@design-studio/contracts";
import { sharedSourceOf } from "@design-studio/contracts/app";
import type { SharedSource } from "@design-studio/contracts/app";
import { useState } from "react";

import { useElementClasses } from "./inspector-classes.js";
import type { InspectorProps } from "./inspector-model.js";

interface UseUseSiteResult {
  readonly isEditingUse: boolean;
  readonly effective: SelectionContext | undefined;
  readonly sharedEditing: {
    readonly isEditingUse: boolean;
    readonly onToggle: () => void;
    readonly shared: SharedSource;
  } | null;
}

const useUseSite = (props: InspectorProps): UseUseSiteResult => {
  const [componentFor, setComponentFor] = useState<string | null>(null);
  const target = props.selection.length === 1 ? props.selection[0] : undefined;

  const shared =
    target && props.appDir ? sharedSourceOf(target, props.appDir) : null;

  const use =
    shared?.use && shared.name
      ? { component: shared.name, source: shared.use }
      : null;

  const component = useElementClasses(
    props.projectId,
    props.directionId,
    use ? (target?.source ?? null) : null,
    0
  );

  const editingUse =
    Boolean(use) &&
    component.element?.forwardsClassName !== false &&
    componentFor !== target?.selector;

  const effective =
    target && use && editingUse ? { ...target, ...use, usedAt: null } : target;

  const toggle = (): void =>
    setComponentFor(editingUse ? (target?.selector ?? null) : null);

  return {
    isEditingUse: editingUse,
    effective,
    sharedEditing: shared
      ? { isEditingUse: editingUse, onToggle: toggle, shared }
      : null,
  };
};

export { useUseSite };

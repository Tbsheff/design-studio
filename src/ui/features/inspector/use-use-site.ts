import { useState } from "react";

import { sharedSourceOf } from "../../../shared/app.js";
import { useElementClasses } from "./inspector-classes.js";
import type { InspectorProps } from "./inspector-model.js";

const useUseSite = (props: InspectorProps) => {
  const [componentFor, setComponentFor] = useState<string | null>(null);
  const target = props.selection.length === 1 ? props.selection[0] : undefined;

  const shared =
    target && props.appDir ? sharedSourceOf(target, props.appDir) : null;

  const use =
    shared?.use && shared.name
      ? { source: shared.use, component: shared.name }
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

  const toggle = () =>
    setComponentFor(editingUse ? (target?.selector ?? null) : null);

  return {
    editingUse,
    effective,
    sharedEditing: shared ? { shared, editingUse, onToggle: toggle } : null,
  };
};

export { useUseSite };

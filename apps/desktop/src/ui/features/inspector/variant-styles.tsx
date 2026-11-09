import type { ComponentInstance } from "@design-studio/contracts/props";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { ClassChips } from "./class-chips.js";
import { ClassEditors } from "./class-editors.js";
import { copy } from "./copy.js";
import { toVariantWarning } from "./props-model.js";
import type { PropsStatus } from "./props-model.js";
import { useVariantSelection } from "./use-variant-selection.js";
import { useVariantSend } from "./use-variant-send.js";
import { VariantPicker } from "./variant-picker.js";

interface VariantStylesProps {
  readonly projectId: string;
  readonly directionId: string;
  readonly instance: ComponentInstance;
  readonly onStatus: (status: PropsStatus) => void;
}

const VariantStyles = ({
  projectId,
  directionId,
  instance,
  onStatus,
}: VariantStylesProps): ReactElement | null => {
  const { groups, group, option, classNames, onProp, onValue } =
    useVariantSelection(instance);

  const send = useVariantSend({
    directionId,
    group,
    instance,
    onStatus,
    option,
    projectId,
  });

  const onRemove = useCallback(
    (name: string) => send({ classes: { remove: [name] } }),
    [send]
  );

  const { component } = instance;

  if (!component?.cva || !group || !option) {
    return null;
  }

  return (
    <div className="prp-variant">
      <p className="ins-note prp-warn" role="note">
        {toVariantWarning(
          component.name,
          group.prop,
          option.value,
          instance.uses
        )}
      </p>
      <VariantPicker
        groups={groups}
        group={group}
        value={option.value}
        onProp={onProp}
        onValue={onValue}
      />
      <ClassChips
        classes={classNames}
        isEditable={option.editable}
        onRemove={onRemove}
      />
      {option.editable && (
        <ClassEditors
          directionId={directionId}
          projectId={projectId}
          onSend={send}
        />
      )}
      {!option.editable && (
        <p className="ins-note">{copy.theseClassesAreNotAPlain}</p>
      )}
    </div>
  );
};

export { VariantStyles };

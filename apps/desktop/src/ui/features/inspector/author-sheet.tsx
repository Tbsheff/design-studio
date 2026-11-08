import type {
  ComponentInstance,
  PropValue,
} from "@design-studio/contracts/props";
import { Suspense, useCallback } from "react";
import type { ReactElement } from "react";

import { VariantSheet } from "../../inspector-slots.js";
import { toInitialValue } from "./props-model.js";
import type { PropsStatus, SheetTarget } from "./props-model.js";

interface AuthorSheetProps {
  readonly projectId: string;
  readonly directionId: string;
  readonly instance: ComponentInstance;
  readonly sheet: SheetTarget | null;
  readonly onClose: () => void;
  readonly onUse: (name: string, value: PropValue | null) => void;
  readonly onStatus: (status: PropsStatus) => void;
}

interface SavedVariant {
  readonly key: string;
  readonly title: string;
  readonly shouldUseOnSelected: boolean;
  readonly value: string;
}

const AuthorSheet = ({
  projectId,
  directionId,
  instance,
  sheet,
  onClose,
  onUse,
  onStatus,
}: AuthorSheetProps): ReactElement | null => {
  const onSaved = useCallback(
    (saved: SavedVariant) => {
      onClose();

      if (saved.shouldUseOnSelected) {
        onUse(saved.key, saved.value);
      } else {
        onStatus({ kind: "saved", text: saved.title });
      }
    },
    [onClose, onUse, onStatus]
  );

  const { component } = instance;

  const group = component?.cva?.variants.find(
    (entry) => entry.prop === sheet?.prop
  );

  if (!sheet || !component || !group) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <VariantSheet
        projectId={projectId}
        directionId={directionId}
        component={component}
        group={group}
        mode={sheet.mode}
        current={toInitialValue(instance, group)}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Suspense>
  );
};

export { AuthorSheet };

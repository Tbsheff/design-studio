import type { SelectionContext } from "@design-studio/contracts";
import type {
  ComponentInstance,
  PropValue,
} from "@design-studio/contracts/props";
import { useCallback, useState } from "react";

import type { SheetMode } from "./author-model.js";
import type { PropsStatus, SheetTarget } from "./props-model.js";
import { useInstance } from "./use-instance.js";
import { usePropEdit } from "./use-prop-edit.js";

interface PropsPanelInput {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext;
  readonly isEditable: boolean;
}

interface PropsPanelState {
  readonly instance: ComponentInstance | null;
  readonly status: PropsStatus;
  readonly setStatus: (status: PropsStatus) => void;
  readonly isStylesOpen: boolean;
  readonly onToggleStyles: () => void;
  readonly sheet: SheetTarget | null;
  readonly onCloseSheet: () => void;
  readonly onOpenSheet: (prop: string, mode: SheetMode) => void;
  readonly onChange: (name: string, value: PropValue | null) => void;
}

const usePropsPanel = ({
  projectId,
  directionId,
  selection,
  isEditable,
}: PropsPanelInput): PropsPanelState => {
  const { instance, setInstance } = useInstance(
    projectId,
    directionId,
    selection
  );

  const [status, setStatus] = useState<PropsStatus>({ kind: "idle" });
  const [isStylesOpen, setIsStylesOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);

  const onCloseSheet = useCallback(() => setSheet(null), []);

  const onToggleStyles = useCallback(
    () => setIsStylesOpen((open) => !open),
    []
  );

  const onOpenSheet = useCallback(
    (prop: string, mode: SheetMode) => {
      if (isEditable) {
        setSheet({ mode, prop });
      }
    },
    [isEditable]
  );

  const onChange = usePropEdit({
    directionId,
    instance,
    projectId,
    setInstance,
    setStatus,
  });

  return {
    instance,
    isStylesOpen,
    onChange,
    onCloseSheet,
    onOpenSheet,
    onToggleStyles,
    setStatus,
    sheet,
    status,
  };
};

export { usePropsPanel };

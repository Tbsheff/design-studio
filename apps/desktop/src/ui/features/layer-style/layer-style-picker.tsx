import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import { LayerStylePickerForm } from "./layer-style-picker-form.js";
import type { LayerStyleHost } from "./use-layer-style-host.js";

import styles from "./layer-style.module.css";

interface LayerStylePickerProps {
  readonly host: LayerStyleHost;
}

const LayerStylePicker = ({ host }: LayerStylePickerProps): ReactElement => {
  const { close } = host;

  const handleDismiss = useCallback((): boolean => {
    close();

    return true;
  }, [close]);

  const { ref } = useModalDialog(handleDismiss);

  return (
    <dialog
      aria-label={copy.pickTitle}
      className={`modal ${styles.dialog}`}
      ref={ref}
    >
      <LayerStylePickerForm host={host} />
    </dialog>
  );
};

export { LayerStylePicker };

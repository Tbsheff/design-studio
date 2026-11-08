import { useModalDialog } from "@design-studio/ui";
import type { ReactElement } from "react";

import {
  useBackdropDismiss,
  useEscapeShield,
} from "../../platform/use-backdrop-dismiss.js";
import { copy } from "./copy.js";
import { FigmaImportBody } from "./figma-import-body.js";
import { FigmaImportFoot } from "./figma-import-foot.js";
import { FigmaImportHead } from "./figma-import-head.js";
import { useFigmaImport } from "./use-figma-import.js";
import type { FigmaImportInput } from "./use-figma-import.js";

const FigmaImportDialog = (props: FigmaImportInput): ReactElement => {
  const flow = useFigmaImport(props);
  const { ref } = useModalDialog(flow.dismiss);
  useBackdropDismiss(ref, flow.dismiss);
  useEscapeShield(ref);

  const isDisabled = flow.isLoading || !flow.preview || flow.failure !== null;

  return (
    <dialog
      ref={ref}
      className="modal fgi-dialog"
      aria-label={copy.importFigmaFrame}
    >
      <form className="modal-form" onSubmit={flow.handleSubmit} noValidate>
        <FigmaImportHead fileName={flow.preview?.fileName ?? null} />
        <FigmaImportBody canNest={props.canNest} flow={flow} />
        <FigmaImportFoot
          isDisabled={isDisabled}
          isPending={flow.isPending}
          onClose={props.onClose}
        />
      </form>
    </dialog>
  );
};

export { FigmaImportDialog };

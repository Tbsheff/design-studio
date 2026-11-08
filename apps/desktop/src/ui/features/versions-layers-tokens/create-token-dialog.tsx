import { TOKEN_GROUP_FOR_PROPERTY } from "@design-studio/contracts";
import type {
  CompiledTokenEntry,
  CreateTokenResult,
} from "@design-studio/contracts";
import { useModalDialog } from "@design-studio/ui";
import type { KeyboardEvent, ReactNode } from "react";

import { displayColor, isValidColor } from "../inspector/css-values.js";
import type { CreateRequest } from "../inspector/use-token-snap.js";
import { COPY } from "./copy.js";
import { CreateTokenBody } from "./create-token-body.js";
import { CreateTokenFoot } from "./create-token-foot.js";
import { CreateTokenHead } from "./create-token-head.js";
import type { CreateTokenSubmit } from "./create-token-types.js";
import { useCreateToken } from "./use-create-token.js";

interface DialogProps {
  request: CreateRequest;
  entries: CompiledTokenEntry[];
  onSubmit: (input: CreateTokenSubmit) => Promise<CreateTokenResult>;
  onClose: () => void;
}

const toPaint = (value: string): string => {
  if (value && isValidColor(value)) {
    return value;
  }

  return "transparent";
};

const handleDialogKeyDown = (event: KeyboardEvent): void => {
  if (event.key === "Escape") {
    event.stopPropagation();
  }
};

const CreateTokenDialog = ({
  request,
  entries,
  onSubmit,
  onClose,
}: DialogProps): ReactNode => {
  const group = TOKEN_GROUP_FOR_PROPERTY[request.prop] ?? "color";
  const isColor = group === "color";
  let initialValue = request.value;
  let valuePaint: string | null = null;

  if (isColor) {
    initialValue = displayColor(request.value);
  }

  const form = useCreateToken({
    entries,
    group,
    initialValue,
    isColor: isValidColor,
    onClose,
    onSubmit,
  });

  if (isColor) {
    valuePaint = toPaint(form.value);
  }

  const dialog = useModalDialog(() => {
    if (form.busy) {
      return false;
    }

    onClose();
  });

  const { onMouseDown: handleMouseDown, ref } = dialog;
  const { submit: handleSubmit } = form;

  return (
    <dialog
      ref={ref}
      className="modal tk-dialog"
      aria-label={COPY.labelCreateToken}
      onMouseDown={handleMouseDown}
      onKeyDown={handleDialogKeyDown}
    >
      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        <CreateTokenHead />
        <CreateTokenBody
          darkPaint={toPaint(form.dark)}
          form={form}
          isColor={isColor}
          valuePaint={valuePaint}
        />
        <CreateTokenFoot
          isBusy={form.busy}
          isTouchedInvalid={form.touched && form.problems.isInvalid}
          onClose={onClose}
        />
      </form>
    </dialog>
  );
};

export { CreateTokenDialog };

export type { CreateTokenSubmit } from "./create-token-types.js";

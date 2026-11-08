import { TOKEN_GROUP_FOR_PROPERTY } from "@design-studio/contracts";
import type {
  CompiledTokenEntry,
  CreateTokenResult,
} from "@design-studio/contracts";
import { useModalDialog } from "@design-studio/ui";
import type { ReactNode } from "react";

import {
  useBackdropDismiss,
  useEscapeShield,
} from "../../platform/use-backdrop-dismiss.js";
import { toDisplayColor, isValidColor } from "../inspector/index.js";
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

const toInitialValue = (request: CreateRequest, isColor: boolean): string => {
  if (isColor) {
    return toDisplayColor(request.value);
  }

  return request.value;
};

const CreateTokenDialog = (props: DialogProps): ReactNode => {
  const { onClose, request } = props;
  const tokenGroup = TOKEN_GROUP_FOR_PROPERTY[request.prop] ?? "color";
  const isColor = tokenGroup === "color";
  let valuePaint: string | null = null;

  const form = useCreateToken({
    entries: props.entries,
    group: tokenGroup,
    initialValue: toInitialValue(request, isColor),
    isColor: isValidColor,
    onClose: props.onClose,
    onSubmit: props.onSubmit,
  });

  if (isColor) {
    valuePaint = toPaint(form.value);
  }

  const dismiss = (): boolean => {
    if (form.busy) {
      return false;
    }

    onClose();

    return true;
  };

  const { ref } = useModalDialog(dismiss);
  useBackdropDismiss(ref, dismiss);
  useEscapeShield(ref);
  const { submit: handleSubmit } = form;

  return (
    <dialog
      ref={ref}
      className="modal tk-dialog"
      aria-label={COPY.labelCreateToken}
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

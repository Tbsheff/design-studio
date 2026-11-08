import type { PortStartResult } from "@design-studio/contracts/port";
import type { ReactElement } from "react";

import { FormBody } from "./port-form-body.js";
import { FormFoot } from "./port-form-foot.js";
import { Started } from "./port-started.js";
import type { PortForm } from "./use-port-form.js";

const PortDialogBody = ({
  form,
  error,
  isBusy,
  started,
  appName,
  onClose,
}: {
  form: PortForm;
  error: string | null;
  isBusy: boolean;
  started: PortStartResult | null;
  appName: string;
  onClose: () => void;
}): ReactElement => {
  if (started) {
    return <Started result={started} appName={appName} onClose={onClose} />;
  }

  return (
    <>
      <FormBody form={form} error={error} />
      <FormFoot
        form={form}
        isBusy={isBusy}
        count={form.pages.picked.length}
        appName={appName}
        onClose={onClose}
      />
    </>
  );
};

export { PortDialogBody };

import type { ReactElement } from "react";

import { AdvancedDetails } from "./nds-advanced-details.js";
import { AdvancedFields } from "./nds-advanced-fields.js";
import type { DraftForm, Patch } from "./new-design-system-values.js";

const Advanced = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}): ReactElement => {
  const count = [
    form.tokensFile,
    form.folder.trim(),
    form.designMd.trim(),
  ].filter(Boolean).length;

  return (
    <AdvancedDetails isOpen={count > 0}>
      <AdvancedFields form={form} set={set} />
    </AdvancedDetails>
  );
};

export { Advanced };

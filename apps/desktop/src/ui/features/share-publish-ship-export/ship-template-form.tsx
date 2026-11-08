import type { ShipSettings } from "@design-studio/contracts/ship";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ShipTemplateBody } from "./ship-template-body.js";
import { ShipTemplateField } from "./ship-template-field.js";

interface Props {
  draft: ShipSettings;
  onPatch: (patch: Partial<ShipSettings>) => void;
  onPatchBody: (bodyTemplate: string) => void;
}

const ShipTemplateForm = ({
  draft,
  onPatch,
  onPatchBody,
}: Props): ReactElement => (
  <>
    <div className="ship-settings-row">
      <ShipTemplateField
        field="user"
        label={copy.yourNameInBranches}
        placeholder={copy.fromGitUser}
        value={draft.user}
        onChange={onPatch}
      />
      <ShipTemplateField
        field="issueId"
        label={copy.issueId}
        placeholder={copy.qa1234}
        value={draft.issueId}
        onChange={onPatch}
      />
    </div>
    <ShipTemplateField
      field="branchTemplate"
      label={copy.branchTemplate}
      placeholder={null}
      value={draft.branchTemplate}
      onChange={onPatch}
    />
    <ShipTemplateBody value={draft.bodyTemplate} onChange={onPatchBody} />
  </>
);

export { ShipTemplateForm };

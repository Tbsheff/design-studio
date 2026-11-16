import type { ReactElement } from "react";

import type { PublishPlan } from "../../../shared/publish.js";
import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import { toPlanRows } from "./publish-plan-model.js";
import { PublishPlanRow } from "./publish-plan-row.js";

interface PublishPlanViewProps {
  readonly plan: PublishPlan;
}

const NOTE_ROLE = "note";

const PublishPlanView = ({ plan }: PublishPlanViewProps): ReactElement => {
  const reach = pick(
    plan.republishOf,
    copy.republishNote,
    copy.anyoneHasAddress
  );

  const target = pick(
    plan.backend === "local",
    copy.targetLocal,
    copy.targetWorker
  );

  return (
    <div className="publish-plan" data-testid="publish-plan">
      <div className="alert publish-public" role="alert">
        {`${copy.goesPublic} ${reach}`}
      </div>
      {plan.warnings.map((warning) => (
        <div key={warning} className="alert small" role={NOTE_ROLE}>
          {warning}
        </div>
      ))}
      <dl className="publish-plan-list">
        {toPlanRows(plan).map((row) => (
          <PublishPlanRow key={row.label} row={row} />
        ))}
      </dl>
      <p className="share-link-note">
        {`${target} ${copy.onlyNewFilesUpload}`}
      </p>
    </div>
  );
};

export { PublishPlanView };

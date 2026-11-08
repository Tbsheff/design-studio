import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { AppField } from "./port-app-field.js";
import { FrameField } from "./port-frame-field.js";
import { PageList } from "./port-page-list.js";
import { PlanSummary } from "./port-plan-summary.js";
import { RouteField } from "./port-route-field.js";
import type { PortForm } from "./use-port-form.js";

const FormBody = ({
  form,
  error,
}: {
  form: PortForm;
  error: string | null;
}): ReactElement => {
  const isMulti = form.pages.all.length > 1;

  return (
    <div className="modal-body port-body">
      <FrameField form={form} isMulti={isMulti} />
      {!form.htmlSource && (
        <p className="port-note error">{COPY.textMoveToAppWorks}</p>
      )}
      <AppField form={form} />
      <RouteField form={form} isMulti={isMulti} />
      {form.badRoute && <p className="port-note error">{form.badRoute}</p>}
      {form.chosenApp && <PageList form={form} />}
      {form.chosenApp && (
        <PlanSummary
          pages={form.pages.picked}
          links={form.pages.links}
          isLoading={form.plan.loading}
          error={form.plan.error}
        />
      )}
      {error && (
        <div className="alert error small" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export { FormBody };

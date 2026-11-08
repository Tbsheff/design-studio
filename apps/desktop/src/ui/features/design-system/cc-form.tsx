import type { ReactElement, ReactNode } from "react";

import { CcFolderField } from "./cc-folder-field.js";
import { CcHead } from "./cc-head.js";
import { CcNameField } from "./cc-name-field.js";
import { COPY } from "./copy.js";
import { toSubmitLabel } from "./create-component-model.js";
import type { CreateComponent } from "./use-create-component.js";

const CcForm = ({
  children,
  count,
  form,
  onClose,
}: {
  children: ReactNode;
  count: number;
  form: CreateComponent;
  onClose: () => void;
}): ReactElement => {
  const { submit } = form;

  return (
    <form className="modal-form" onSubmit={submit} noValidate>
      <CcHead count={count} />
      <div className="modal-body cc-form">
        <CcNameField form={form} />
        <CcFolderField>{children}</CcFolderField>
        {(form.failure ?? form.note) && (
          <div className="alert error small" role="alert">
            {form.failure ?? form.note}
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button
          type="button"
          className="btn ghost"
          onClick={onClose}
          disabled={form.isPending}
        >
          {COPY.textCancel}
        </button>
        <button
          type="submit"
          className="btn primary"
          disabled={!form.canSubmit}
        >
          {toSubmitLabel(form.isPending)}
        </button>
      </div>
    </form>
  );
};

export { CcForm };

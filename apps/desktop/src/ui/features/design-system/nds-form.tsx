import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { NdsSide } from "./nds-side.js";
import { NdsSources } from "./nds-sources.js";
import type { NewDesignSystemState } from "./use-new-design-system.js";

const NdsForm = ({
  state,
  onCancel,
}: {
  state: NewDesignSystemState;
  onCancel: () => void;
}): ReactElement => {
  const { failure, form, isBusy, isReady, set, submit } = state;

  return (
    <form className="nds-form" onSubmit={submit} aria-busy={isBusy}>
      <div className="nds-head">
        <h1>{COPY.textNewDesignSystem}</h1>
        <p className="muted">{COPY.textAddWhatYouHave}</p>
      </div>
      <NdsSources form={form} set={set} />
      <NdsSide
        form={form}
        set={set}
        error={failure}
        isBusy={isBusy}
        isReady={isReady}
        onCancel={onCancel}
      />
    </form>
  );
};

export { NdsForm };

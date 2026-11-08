import type { ReactElement } from "react";

import { NdsForm } from "./nds-form.js";
import { NdsHeader } from "./nds-header.js";
import { useNewDesignSystem } from "./use-new-design-system.js";

const NewDesignSystem = ({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (projectId: string) => void;
}): ReactElement => {
  const state = useNewDesignSystem(onCreated);

  return (
    <div className="home nds">
      <NdsHeader isBusy={state.isBusy} onCancel={onCancel} />
      <main className="nds-main">
        <NdsForm state={state} onCancel={onCancel} />
      </main>
    </div>
  );
};

export { NewDesignSystem };

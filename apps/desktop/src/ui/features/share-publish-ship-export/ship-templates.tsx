import { useCallback, useLayoutEffect } from "react";
import type { MutableRefObject, ReactElement } from "react";

import { copy } from "./copy.js";

import "../../styles/ship.css";
import { shipApi } from "./ship-api.js";
import { ShipTemplateForm } from "./ship-template-form.js";
import { useShipSettings } from "./use-ship-settings.js";

interface Props {
  projectId: string;
  saveRef: MutableRefObject<(() => Promise<void>) | null>;
}

const ShipTemplates = ({ projectId, saveRef }: Props): ReactElement => {
  const { draft, loadError, patch } = useShipSettings(projectId);

  useLayoutEffect(() => {
    saveRef.current = null;

    if (draft) {
      saveRef.current = async (): Promise<void> => {
        await shipApi.saveSettings(projectId, draft);
      };
    }
  }, [draft, projectId, saveRef]);

  const patchBody = useCallback(
    (bodyTemplate: string): void => {
      patch({ bodyTemplate });
    },
    [patch]
  );

  return (
    <section className="ship-settings" aria-label={copy.shipTemplates}>
      <h3>{copy.shipAsBranchAnd}</h3>
      {loadError && <p className="field-help">{loadError}</p>}
      {draft && (
        <ShipTemplateForm
          draft={draft}
          onPatch={patch}
          onPatchBody={patchBody}
        />
      )}
    </section>
  );
};

export { ShipTemplates };

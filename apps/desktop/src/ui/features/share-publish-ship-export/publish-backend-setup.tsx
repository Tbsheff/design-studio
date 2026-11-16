import type { ReactElement } from "react";

import type { PublishCliState } from "../../../shared/publish.js";
import { pick } from "../../platform/pick.js";
import { BackendActions } from "./backend-actions.js";
import { toBackendSummary, toKeyStoreText } from "./backend-model.js";
import { BackendStepRow } from "./backend-step-row.js";
import { copy } from "./copy.js";
import type { PublishBackend } from "./use-publish-backend.js";

interface Props {
  hook: PublishBackend;
  cli: PublishCliState | null;
}

const BackendSetup = ({ cli, hook }: Props): ReactElement => {
  const { backend, error, load, setup } = hook;

  if (!backend) {
    return (
      <p className="field-help">{error ?? "Reading the publish setup…"}</p>
    );
  }

  return (
    <div
      className="publish-step publish-backend"
      data-testid="publish-backend"
      data-ready={pick(backend.ready, "yes", "no")}
    >
      <p className="publish-step-text">{toBackendSummary(backend)}</p>
      {backend.keyStore && (
        <div className="publish-kv">
          <span>{copy.publishKey}</span>
          <strong>{toKeyStoreText(backend.keyStore)}</strong>
        </div>
      )}
      {backend.steps.length > 0 && (
        <ol className="publish-setup-steps" aria-label={copy.setupSteps}>
          {backend.steps.map((setupStep) => (
            <BackendStepRow key={setupStep.id} step={setupStep} />
          ))}
        </ol>
      )}
      {error && (
        <div className="alert error small" role="alert">
          {error}
        </div>
      )}
      <BackendActions
        backend={backend}
        cli={cli}
        onLoad={load}
        onSetup={setup}
      />
    </div>
  );
};

export { BackendSetup };

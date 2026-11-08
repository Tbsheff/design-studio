import { useCallback } from "react";
import type { ReactElement } from "react";

import type {
  PublishBackendMode,
  PublishBackendState,
  PublishCliState,
} from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { pick } from "./pick.js";

interface Props {
  backend: PublishBackendState;
  cli: PublishCliState | null;
  onLoad: (check?: boolean) => Promise<void>;
  onSetup: (mode: PublishBackendMode) => Promise<void>;
}

const BackendActions = ({
  backend,
  cli,
  onLoad,
  onSetup,
}: Props): ReactElement => {
  const isReady = Boolean(
    cli?.installed && cli.versionOk && cli.signedIn && cli.accountId
  );

  const isBusy = backend.running;

  const setupCloud = useCallback((): void => {
    onSetup("cloudflare");
  }, [onSetup]);

  const setupLocal = useCallback((): void => {
    onSetup("local");
  }, [onSetup]);

  const testConnection = useCallback((): void => {
    onLoad(true);
  }, [onLoad]);

  return (
    <div className="publish-step-actions">
      <button
        type="button"
        className="btn small primary"
        disabled={isBusy || !isReady}
        onClick={setupCloud}
        data-tip={pick(
          isReady,
          "Runs cf in your Cloudflare account. Each step checks first.",
          "Sign in to Cloudflare first"
        )}
      >
        {pick(
          backend.mode === "cloudflare" && backend.setUpAt,
          "Run setup again",
          "Set up publishing"
        )}
      </button>
      {backend.localAllowed && (
        <button
          type="button"
          className="btn small"
          disabled={isBusy || !cli?.installed}
          onClick={setupLocal}
          data-tip={copy.developmentOnlyLocal}
        >
          {copy.setUpLocalTest}
        </button>
      )}
      {backend.setUpAt && (
        <button
          type="button"
          className="btn small ghost"
          disabled={isBusy}
          onClick={testConnection}
          data-tip={copy.callsTheWorker}
        >
          {copy.testConnection}
        </button>
      )}
    </div>
  );
};

export { BackendActions };

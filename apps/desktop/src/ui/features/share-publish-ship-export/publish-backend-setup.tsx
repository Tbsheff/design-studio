import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";

import type {
  PublishBackendMode,
  PublishBackendState,
  PublishCliState,
  SetupStep,
} from "../../../shared/publish.js";
import { errorText } from "../../api.js";
import { copy } from "./copy.js";
import { pick } from "./pick.js";
import { publishApi } from "./publish-api.js";

const usePublishBackend = (): {
  backend: PublishBackendState | null;
  error: string | null;
  load: (check?: boolean) => Promise<void>;
  setup: (mode: PublishBackendMode) => Promise<void>;
} => {
  const [backend, setBackend] = useState<PublishBackendState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (check = false) => {
    try {
      setBackend(await publishApi.backend(check));
      setError(null);
    } catch (failure) {
      setError(errorText(failure));
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);
  const running = backend?.running === true;
  useEffect(() => {
    if (!running) {
      return;
    }

    const timer = globalThis.setInterval(() => void load(), 1000);

    return (): void => globalThis.clearInterval(timer);
  }, [running, load]);

  const setup = useCallback(async (mode: PublishBackendMode) => {
    try {
      setError(null);
      setBackend(await publishApi.setup(mode));
    } catch (failure) {
      setError(errorText(failure));
    }
  }, []);

  return { backend, error, load, setup };
};

type BackendHook = ReturnType<typeof usePublishBackend>;

const MARK: Record<SetupStep["status"], string> = {
  done: "✓",
  failed: "✕",
  pending: "○",
  running: "◌",
  skipped: "–",
};

const StepRow = ({ step }: { step: SetupStep }): ReactElement => (
  <li
    className={`publish-setup-step is-${step.status}`}
    data-testid="setup-step"
    data-step={step.id}
    data-status={step.status}
  >
    <span className="publish-setup-mark" aria-hidden="true">
      {MARK[step.status]}
    </span>
    <div className="publish-setup-text">
      <span className="publish-setup-label">{step.label}</span>
      {step.detail && (
        <span className="publish-setup-detail">{step.detail}</span>
      )}
      {step.command && (
        <code className="mono publish-setup-command">{step.command}</code>
      )}
    </div>
  </li>
);

const summary = (backend: PublishBackendState): string => {
  if (backend.running) {
    return "Setting up. Each step shows its result below.";
  }

  if (backend.ready && backend.url) {
    return `Ready. One Worker serves every published design at ${backend.url}${pick(backend.mode === "local", " (local test server)", "")}.`;
  }

  if (backend.error) {
    return backend.error;
  }

  return "Not set up. Setup makes an R2 bucket, a D1 database and one publish Worker in your Cloudflare account. A re-run is safe.";
};

const BackendSetup = ({
  hook,
  cli,
}: {
  hook: BackendHook;
  cli: PublishCliState | null;
}): ReactElement => {
  const { backend, error, setup, load } = hook;

  if (!backend) {
    return (
      <p className="field-help">{error ?? "Reading the publish setup…"}</p>
    );
  }

  const cfReady = Boolean(
    cli?.installed && cli.versionOk && cli.signedIn && cli.accountId
  );

  const busy = backend.running;

  return (
    <div
      className="publish-step publish-backend"
      data-testid="publish-backend"
      data-ready={pick(backend.ready, "yes", "no")}
    >
      <p className="publish-step-text">{summary(backend)}</p>
      {backend.keyStore && (
        <div className="publish-kv">
          <span>{copy.publishKey}</span>
          <strong>
            {pick(
              backend.keyStore === "keychain",
              "In the macOS Keychain",
              "In a private file on this Mac (the Keychain needs the desktop app)"
            )}
          </strong>
        </div>
      )}
      {backend.steps.length > 0 && (
        <ol className="publish-setup-steps" aria-label={copy.setupSteps}>
          {backend.steps.map((setupStep) => (
            <StepRow key={setupStep.id} step={setupStep} />
          ))}
        </ol>
      )}
      {error && (
        <div className="alert error small" role="alert">
          {error}
        </div>
      )}
      <div className="publish-step-actions">
        <button
          type="button"
          className="btn small primary"
          disabled={busy || !cfReady}
          onClick={() => void setup("cloudflare")}
          data-tip={pick(
            cfReady,
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
            disabled={busy || !cli?.installed}
            onClick={() => void setup("local")}
            data-tip={copy.developmentOnlyLocal}
          >
            {copy.setUpLocalTest}
          </button>
        )}
        {backend.setUpAt && (
          <button
            type="button"
            className="btn small ghost"
            disabled={busy}
            onClick={() => void load(true)}
            data-tip={copy.callsTheWorker}
          >
            {copy.testConnection}
          </button>
        )}
      </div>
    </div>
  );
};

export { usePublishBackend, BackendSetup };

export type { BackendHook };

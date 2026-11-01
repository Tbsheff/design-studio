import { useCallback, useEffect, useState } from "react";

import type {
  PublishBackendMode,
  PublishBackendState,
  PublishCliState,
  SetupStep,
} from "../../shared/publish";
import { errorText } from "../api";
import { publishApi } from "../publishApi";

export function usePublishBackend() {
  const [backend, setBackend] = useState<PublishBackendState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (check = false) => {
    try {
      setBackend(await publishApi.backend(check));
      setError(null);
    } catch (err) {
      setError(errorText(err));
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

    const timer = window.setInterval(() => void load(), 1000);

    return () => window.clearInterval(timer);
  }, [running, load]);

  const setup = useCallback(async (mode: PublishBackendMode) => {
    try {
      setError(null);
      setBackend(await publishApi.setup(mode));
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  return { backend, error, load, setup };
}

export type BackendHook = ReturnType<typeof usePublishBackend>;

const MARK: Record<SetupStep["status"], string> = {
  pending: "○",
  running: "◌",
  done: "✓",
  skipped: "–",
  failed: "✕",
};

function StepRow({ step }: { step: SetupStep }) {
  return (
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
}

function summary(backend: PublishBackendState): string {
  if (backend.running) {
    return "Setting up. Each step shows its result below.";
  }

  if (backend.ready && backend.url) {
    return `Ready. One Worker serves every published design at ${backend.url}${backend.mode === "local" ? " (local test server)" : ""}.`;
  }

  if (backend.error) {
    return backend.error;
  }

  return "Not set up. Setup makes an R2 bucket, a D1 database and one publish Worker in your Cloudflare account. A re-run is safe.";
}

export function BackendSetup({
  hook,
  cli,
}: {
  hook: BackendHook;
  cli: PublishCliState | null;
}) {
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
      data-ready={backend.ready ? "yes" : "no"}
    >
      <p className="publish-step-text">{summary(backend)}</p>
      {backend.keyStore && (
        <div className="publish-kv">
          <span>Publish key</span>
          <strong>
            {backend.keyStore === "keychain"
              ? "In the macOS Keychain"
              : "In a private file on this Mac (the Keychain needs the desktop app)"}
          </strong>
        </div>
      )}
      {backend.steps.length > 0 && (
        <ol className="publish-setup-steps" aria-label="Setup steps">
          {backend.steps.map((s) => (
            <StepRow key={s.id} step={s} />
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
          data-tip={
            cfReady
              ? "Runs cf in your Cloudflare account. Each step checks first."
              : "Sign in to Cloudflare first"
          }
        >
          {backend.mode === "cloudflare" && backend.setUpAt
            ? "Run setup again"
            : "Set up publishing"}
        </button>
        {backend.localAllowed && (
          <button
            type="button"
            className="btn small"
            disabled={busy || !cli?.installed}
            onClick={() => void setup("local")}
            data-tip="Development only: local R2 and D1, a Worker on 127.0.0.1"
          >
            Set up local test server
          </button>
        )}
        {backend.setUpAt && (
          <button
            type="button"
            className="btn small ghost"
            disabled={busy}
            onClick={() => void load(true)}
            data-tip="Calls the Worker health check with the publish key"
          >
            Test connection
          </button>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState, useTransition } from "react";

import type { PublishCliState } from "../../../shared/publish.js";
import { errorText } from "../../api.js";
import { CopyButton } from "../../kit/CopyButton.js";
import { publishApi } from "./publish-api.js";
import { BackendSetup, usePublishBackend } from "./publish-backend-setup.js";
import type { BackendHook } from "./publish-backend-setup.js";

import "../../styles/publish.css";

export function usePublishCli() {
  const [cli, setCli] = useState<PublishCliState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback((task: () => Promise<PublishCliState>) => {
    setError(null);
    startTransition(async () => {
      try {
        const next = await task();
        setCli(next);
      } catch (failure) {
        setError(errorText(failure));
      }
    });
  }, []);

  useEffect(() => {
    run(() => publishApi.cli());
  }, [run]);
  const waiting = cli?.login.running === true;
  useEffect(() => {
    if (!waiting) {
      return;
    }

    const refresh = (): void => {
      run(() => publishApi.cli());
    };

    window.addEventListener("focus", refresh);

    return () => window.removeEventListener("focus", refresh);
  }, [waiting, run]);

  return { busy: isPending, cli, error, run };
}

export function cliReady(cli: PublishCliState | null): boolean {
  return Boolean(
    cli?.installed && cli.versionOk && cli.signedIn && cli.accountId
  );
}

type Cli = ReturnType<typeof usePublishCli>;

function InstallStep({
  cli,
  busy,
  run,
}: {
  cli: PublishCliState;
  busy: boolean;
  run: Cli["run"];
}) {
  const old = cli.installed && !cli.versionOk;

  return (
    <div className="publish-step" data-testid="publish-install">
      <p className="publish-step-text">
        {old
          ? `cf ${cli.version ?? ""} is too old. Publish needs cf ${cli.minVersion} or later.`
          : `Publish uses the Cloudflare CLI (cf ${cli.minVersion} or later). It is not on this Mac yet. Run this in Terminal:`}
      </p>
      <div className="publish-command">
        <code className="mono">{cli.installCommand}</code>
        <CopyButton text={cli.installCommand} label="Copy command" />
      </div>
      <div className="publish-step-actions">
        <button
          type="button"
          className="btn small"
          disabled={busy}
          onClick={() => void run(() => publishApi.cli(true))}
        >
          Check again
        </button>
      </div>
    </div>
  );
}

function SignInStep({
  cli,
  busy,
  run,
}: {
  cli: PublishCliState;
  busy: boolean;
  run: Cli["run"];
}) {
  const [keyring, setKeyring] = useState(cli.keyring);
  const [narrow, setNarrow] = useState(true);

  if (cli.login.running) {
    return (
      <div className="publish-step" data-testid="publish-signing-in">
        <p className="publish-step-text">
          Finish the Cloudflare sign-in in your browser. This page updates when
          it is done.
        </p>
        <div className="publish-step-actions">
          {cli.login.url && (
            <a
              className="btn small"
              href={cli.login.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open sign-in page
            </a>
          )}
          <button
            type="button"
            className="btn small ghost"
            disabled={busy}
            onClick={() => void run(() => publishApi.cancelLogin())}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="publish-step" data-testid="publish-sign-in">
      <p className="publish-step-text">
        cf {cli.version} is ready. Sign in to the Cloudflare account that will
        host your designs. Design Studio never sees your password or token; cf
        keeps the sign-in.
      </p>
      {cli.login.error && <p className="publish-error">{cli.login.error}</p>}
      <label className="publish-check">
        <input
          type="checkbox"
          checked={keyring}
          onChange={(e) => setKeyring(e.target.checked)}
        />
        <span>Lock the sign-in with a key in the macOS Keychain</span>
      </label>
      <label
        className="publish-check"
        data-tip="Off: cf asks for its full default access, for when a publish fails with a permission error"
      >
        <input
          type="checkbox"
          checked={narrow}
          onChange={(e) => setNarrow(e.target.checked)}
        />
        <span>Ask only for Workers access</span>
      </label>
      <div className="publish-step-actions">
        <button
          type="button"
          className="btn small primary"
          disabled={busy}
          onClick={() => void run(() => publishApi.login(keyring, narrow))}
        >
          Sign in with Cloudflare
        </button>
      </div>
    </div>
  );
}

function AccountStep({
  cli,
  busy,
  run,
}: {
  cli: PublishCliState;
  busy: boolean;
  run: Cli["run"];
}) {
  return (
    <div className="publish-step" data-testid="publish-signed-in">
      <div className="publish-kv">
        <span>Signed in</span>
        <strong className="truncate">
          {cli.email ?? "Cloudflare account"}
        </strong>
      </div>
      {cli.accounts.length > 1 ? (
        <label className="field">
          <span>Account</span>
          <select
            value={cli.accountId ?? ""}
            disabled={busy}
            onChange={(e) =>
              void run(() => publishApi.setAccount(e.target.value || null))
            }
          >
            <option value="">Pick an account</option>
            {cli.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="publish-kv">
          <span>Account</span>
          <strong className="truncate">
            {cli.accounts[0]?.name ?? "None"}
          </strong>
        </div>
      )}
      <div className="publish-kv">
        <span>Address</span>
        <code className="mono truncate">
          {cli.subdomain
            ? `<name>.${cli.subdomain}.workers.dev`
            : "<name>.<your-subdomain>.workers.dev"}
        </code>
      </div>
      <div className="publish-step-actions">
        <button
          type="button"
          className="btn small"
          disabled={busy}
          onClick={() => void run(() => publishApi.cli(true))}
          data-tip="Asks cf who is signed in. It changes nothing."
        >
          Test connection
        </button>
        <button
          type="button"
          className="btn small ghost"
          disabled={busy}
          onClick={() => void run(() => publishApi.logout())}
          data-tip="Runs cf auth logout, so cf in Terminal is signed out too"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function PublishSetupBody({
  state,
  backend,
}: {
  state: Cli;
  backend: BackendHook;
}) {
  const { cli, busy, error, run } = state;

  if (!cli) {
    return (
      <p className="field-help">{error ?? "Looking for the Cloudflare CLI…"}</p>
    );
  }

  const installed = cli.installed && cli.versionOk;

  return (
    <>
      {installed ? (
        cli.signedIn ? (
          <AccountStep cli={cli} busy={busy} run={run} />
        ) : (
          <SignInStep cli={cli} busy={busy} run={run} />
        )
      ) : (
        <InstallStep cli={cli} busy={busy} run={run} />
      )}
      {(error ?? cli.error) && (
        <div className="alert error small" role="alert">
          {error ?? cli.error}
        </div>
      )}
      {installed && <BackendSetup hook={backend} cli={cli} />}
    </>
  );
}

function PublishSetup() {
  const state = usePublishCli();
  const backend = usePublishBackend();

  return (
    <section className="ship-settings publish-settings" aria-label="Publishing">
      <h3>Publishing</h3>
      <p className="field-help">
        Share › Publish puts a saved version on your own Cloudflare account. One
        Worker serves every design; files go to R2, links and view counts to D1.
      </p>
      <PublishSetupBody state={state} backend={backend} />
    </section>
  );
}

export { PublishSetup };

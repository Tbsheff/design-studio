import { CopyButton } from "@design-studio/ui";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { ReactElement } from "react";

import type { PublishCliState } from "../../../shared/publish.js";
import { errorText } from "../../api.js";
import { copy } from "./copy.js";
import { publishApi } from "./publish-api.js";
import { BackendSetup, usePublishBackend } from "./publish-backend-setup.js";

import "../../styles/publish.css";
import type { BackendHook } from "./publish-backend-setup.js";

const usePublishCli = (): {
  busy: boolean;
  cli: PublishCliState | null;
  error: string | null;
  run: (task: () => Promise<PublishCliState>) => void;
} => {
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

    globalThis.addEventListener("focus", refresh);

    return (): void => globalThis.removeEventListener("focus", refresh);
  }, [waiting, run]);

  return { busy: isPending, cli, error, run };
};

const cliReady = (cli: PublishCliState | null): boolean =>
  Boolean(cli?.installed && cli.versionOk && cli.signedIn && cli.accountId);

type Cli = ReturnType<typeof usePublishCli>;

const InstallStep = ({
  cli,
  busy,
  run,
}: {
  cli: PublishCliState;
  busy: boolean;
  run: Cli["run"];
}): ReactElement => {
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
          {copy.checkAgain}
        </button>
      </div>
    </div>
  );
};

const SignInStep = ({
  cli,
  busy,
  run,
}: {
  cli: PublishCliState;
  busy: boolean;
  run: Cli["run"];
}): ReactElement => {
  const [keyring, setKeyring] = useState(cli.keyring);
  const [narrow, setNarrow] = useState(true);

  if (cli.login.running) {
    return (
      <div className="publish-step" data-testid="publish-signing-in">
        <p className="publish-step-text">{copy.finishTheCloudflareSign}</p>
        <div className="publish-step-actions">
          {cli.login.url && (
            <a
              className="btn small"
              href={cli.login.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              {copy.openSignInPage}
            </a>
          )}
          <button
            type="button"
            className="btn small ghost"
            disabled={busy}
            onClick={() => void run(() => publishApi.cancelLogin())}
          >
            {copy.cancel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="publish-step" data-testid="publish-sign-in">
      <p className="publish-step-text">
        {copy.cf}
        {cli.version}
        {copy.isReadySignIn}
      </p>
      {cli.login.error && <p className="publish-error">{cli.login.error}</p>}
      <label className="publish-check">
        <input
          type="checkbox"
          checked={keyring}
          onChange={(e) => setKeyring(e.target.checked)}
        />
        <span>{copy.lockTheSignIn}</span>
      </label>
      <label className="publish-check" data-tip={copy.offCfAsks}>
        <input
          type="checkbox"
          checked={narrow}
          onChange={(e) => setNarrow(e.target.checked)}
        />
        <span>{copy.askOnlyForWorkers}</span>
      </label>
      <div className="publish-step-actions">
        <button
          type="button"
          className="btn small primary"
          disabled={busy}
          onClick={() => void run(() => publishApi.login(keyring, narrow))}
        >
          {copy.signInWithCloudflare}
        </button>
      </div>
    </div>
  );
};

const AccountStep = ({
  cli,
  busy,
  run,
}: {
  cli: PublishCliState;
  busy: boolean;
  run: Cli["run"];
}): ReactElement => (
  <div className="publish-step" data-testid="publish-signed-in">
    <div className="publish-kv">
      <span>{copy.signedIn}</span>
      <strong className="truncate">{cli.email ?? "Cloudflare account"}</strong>
    </div>
    {cli.accounts.length > 1 ? (
      <label className="field">
        <span>{copy.account}</span>
        <select
          value={cli.accountId ?? ""}
          disabled={busy}
          onChange={(e) =>
            void run(() => publishApi.setAccount(e.target.value || null))
          }
        >
          <option value="">{copy.pickAnAccount}</option>
          {cli.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
    ) : (
      <div className="publish-kv">
        <span>{copy.account}</span>
        <strong className="truncate">{cli.accounts[0]?.name ?? "None"}</strong>
      </div>
    )}
    <div className="publish-kv">
      <span>{copy.address}</span>
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
        data-tip={copy.asksCfWho}
      >
        {copy.testConnection}
      </button>
      <button
        type="button"
        className="btn small ghost"
        disabled={busy}
        onClick={() => void run(() => publishApi.logout())}
        data-tip={copy.runsCfAuth}
      >
        {copy.signOut}
      </button>
    </div>
  </div>
);

const PublishSetupBody = ({
  state,
  backend,
}: {
  state: Cli;
  backend: BackendHook;
}): ReactElement => {
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
};

const PublishSetup = (): ReactElement => {
  const state = usePublishCli();
  const backend = usePublishBackend();

  return (
    <section
      className="ship-settings publish-settings"
      aria-label={copy.publishing}
    >
      <h3>{copy.publishing}</h3>
      <p className="field-help">{copy.sharePublishPutsA}</p>
      <PublishSetupBody state={state} backend={backend} />
    </section>
  );
};

export { usePublishCli, cliReady, PublishSetupBody, PublishSetup };

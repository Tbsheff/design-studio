import type { ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { CF_INSTALL_COMMAND, CF_MIN_VERSION, compareCfVersion, type PublishCliState, type PublishLoginState } from '../../shared/publish.js';
import { BadRequestError } from '../store/errors.js';
import { cfWhoAmI, cliFailure, loginArgs, newestCf, runCf, type WhoAmI } from './cli.js';
import type { PublishStore } from './store.js';

export interface ReadyCli {
  bin: string;
  accountId: string;
  subdomain: string | null;
}

export interface CliSession {
  state(fresh?: boolean): Promise<PublishCliState>;
  ready(accountId?: string): Promise<ReadyCli>;
  startLogin(keyring: boolean, narrow: boolean): Promise<PublishCliState>;
  cancelLogin(): Promise<PublishCliState>;
  logout(): Promise<PublishCliState>;
  setAccount(accountId: string | null): Promise<PublishCliState>;
  learnSubdomain(accountId: string, subdomain: string): Promise<void>;
}

interface Probe {
  bin: string | null;
  version: string | null;
  at: number;
}

const PROBE_TTL_MS = 60_000;
const WHO_TTL_MS = 30_000;
const LOGIN_TIMEOUT_MS = 5 * 60_000;
const LOGIN_URL = /https:\/\/dash\.cloudflare\.com\/oauth2\/auth\?[^\s"'<>]+/;

export function createCliSession(store: PublishStore): CliSession {
  let probe: Probe | null = null;
  let who: { value: WhoAmI; at: number } | null = null;
  let child: ChildProcess | null = null;
  let login: PublishLoginState = { running: false, url: null, error: null };

  const probeCli = async (fresh: boolean): Promise<Probe> => {
    if (!fresh && probe && Date.now() - probe.at < PROBE_TTL_MS) return probe;
    await mkdir(store.dir, { recursive: true, mode: 0o700 });
    probe = { ...(await newestCf(store.dir)), at: Date.now() };
    return probe;
  };

  const whoAmI = async (bin: string, fresh: boolean): Promise<WhoAmI> => {
    if (!fresh && who && Date.now() - who.at < WHO_TTL_MS) return who.value;
    who = { value: await cfWhoAmI(bin, store.dir), at: Date.now() };
    return who.value;
  };

  const state = async (fresh = false): Promise<PublishCliState> => {
    const found = await probeCli(fresh);
    const settings = await store.settings();
    const versionOk = found.version !== null && compareCfVersion(found.version, CF_MIN_VERSION) >= 0;
    const base: PublishCliState = { installed: found.bin !== null && found.version !== null, version: found.version, minVersion: CF_MIN_VERSION, versionOk, installCommand: CF_INSTALL_COMMAND, signedIn: false, email: null, accounts: [], accountId: null, subdomain: null, keyring: settings.keyring, login, error: null };
    if (!found.bin || !versionOk) return base;
    const me = await whoAmI(found.bin, fresh).catch(() => null);
    if (!me) return { ...base, error: 'cf auth whoami did not answer.' };
    const accountId = me.accounts.find((a) => a.id === settings.accountId)?.id ?? (me.accounts.length === 1 ? (me.accounts[0]?.id ?? null) : null);
    return { ...base, signedIn: me.signedIn, email: me.email, accounts: me.accounts, accountId, subdomain: accountId ? (settings.subdomains[accountId] ?? null) : null };
  };

  const ready = async (accountId?: string): Promise<ReadyCli> => {
    const now = await state();
    if (!now.installed) throw new BadRequestError(`The Cloudflare CLI (cf) is not installed. Run ${CF_INSTALL_COMMAND} in Terminal, then click Check again in Settings → Publishing.`);
    if (!now.versionOk) throw new BadRequestError(`cf ${now.version} is too old. Publish needs cf ${CF_MIN_VERSION} or later: run ${CF_INSTALL_COMMAND}.`);
    if (!now.signedIn) throw new BadRequestError('Sign in to Cloudflare first in Settings → Publishing.');
    const id = accountId ?? now.accountId;
    if (!id || !now.accounts.some((a) => a.id === id)) throw new BadRequestError(accountId ? 'The Cloudflare sign-in has no access to the account of this publication.' : 'Pick a Cloudflare account in Settings → Publishing.');
    const settings = await store.settings();
    return { bin: probe?.bin as string, accountId: id, subdomain: settings.subdomains[id] ?? null };
  };

  const startLogin = async (keyring: boolean, narrow: boolean): Promise<PublishCliState> => {
    if (child) return state();
    const found = await probeCli(true);
    if (!found.bin) throw new BadRequestError(`Install the Cloudflare CLI first: ${CF_INSTALL_COMMAND}.`);
    await store.saveSettings({ keyring });
    login = { running: true, url: null, error: null };
    let seen = '';
    const run = runCf(found.bin, loginArgs(keyring, narrow), {
      cwd: store.dir,
      timeoutMs: LOGIN_TIMEOUT_MS,
      onSpawn: (spawned) => {
        child = spawned;
        const watch = (chunk: Buffer) => {
          seen = (seen + chunk.toString('utf8')).slice(-20_000);
          const match = LOGIN_URL.exec(seen);
          if (match && !login.url) login = { ...login, url: match[0] };
        };
        spawned.stdout?.on('data', watch);
        spawned.stderr?.on('data', watch);
      },
    });
    void run.then((out) => {
      child = null;
      who = null;
      const cancelled = out.code === null && !out.timedOut;
      login = { running: false, url: null, error: out.code === 0 || cancelled ? null : cliFailure(out, 'Sign-in did not finish.') };
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return state();
  };

  const cancelLogin = async (): Promise<PublishCliState> => {
    child?.kill('SIGTERM');
    child = null;
    login = { running: false, url: null, error: null };
    return state(true);
  };

  const logout = async (): Promise<PublishCliState> => {
    const found = await probeCli(false);
    if (found.bin) await runCf(found.bin, ['auth', 'logout'], { cwd: store.dir, timeoutMs: 30_000 });
    who = null;
    return state(true);
  };

  const setAccount = async (accountId: string | null): Promise<PublishCliState> => {
    if (accountId !== null && !/^[A-Za-z0-9]{8,64}$/.test(accountId)) throw new BadRequestError('accountId is not valid');
    await store.saveSettings({ accountId });
    return state();
  };

  const learnSubdomain = async (accountId: string, subdomain: string): Promise<void> => {
    const settings = await store.settings();
    if (settings.subdomains[accountId] === subdomain) return;
    await store.saveSettings({ subdomains: { ...settings.subdomains, [accountId]: subdomain } });
  };

  return { state, ready, startLogin, cancelLogin, logout, setAccount, learnSubdomain };
}

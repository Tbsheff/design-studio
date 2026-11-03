import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { app, safeStorage, shell, type WebContents } from "electron";

const CLOUD_ORIGIN = "https://api.designstudio.app";
const WEB_ORIGIN = "https://app.designstudio.app";
const FLOW_TTL_MS = 10 * 60 * 1000;
const JWT_REFRESH_MS = 12 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;
const SESSION_FILE = "account-session.bin";
const ACCOUNT_IPC = {
  get: "studio:account-get",
  signIn: "studio:account-sign-in",
  confirm: "studio:account-confirm",
  signOut: "studio:account-sign-out",
  change: "studio:account-change",
} as const;

type AccountState = "signed-out" | "pending" | "needs-confirm" | "signed-in";

interface AccountUser {
  id: string;
  email: string;
  name: string;
}

interface AccountOrg {
  id: string;
  name: string;
  role: string;
}

interface AccountView {
  user: AccountUser | null;
  orgs: AccountOrg[];
  state: AccountState;
}

interface PendingFlow {
  verifier: string;
  state: string;
  expiresAt: number;
}

interface StoredSession {
  token: string;
  user: AccountUser;
  orgs: AccountOrg[];
  confirmed: boolean;
}

interface AuthDeps {
  isStudio: (contents: WebContents) => boolean;
  studioContents: () => WebContents[];
  pushDeviceToken: (token: string | null) => void;
  focusWindow: () => void;
  dataDir?: () => string;
}

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

function challengeFor(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toUser(value: unknown): AccountUser | null {
  if (!isRecord(value)) return null;
  const { id, email, name } = value;
  if (typeof id !== "string" || typeof email !== "string") return null;
  return { id, email, name: typeof name === "string" ? name : "" };
}

function toOrgs(value: unknown): AccountOrg[] {
  if (!Array.isArray(value)) return [];
  const orgs: AccountOrg[] = [];
  for (const entry of value as unknown[]) {
    if (!isRecord(entry)) continue;
    const { id, name, role } = entry;
    if (typeof id === "string" && typeof name === "string")
      orgs.push({ id, name, role: typeof role === "string" ? role : "member" });
  }
  return orgs;
}

async function postJson(
  route: string,
  body: Record<string, unknown>,
  token: string | null
): Promise<unknown> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(new URL(route, CLOUD_ORIGIN), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`cloud ${route} ${response.status}`);
  return response.json();
}

function toStored(payload: unknown): StoredSession | null {
  if (!isRecord(payload)) return null;
  const user = toUser(payload.user);
  const token = payload.session_token;
  if (!user || typeof token !== "string" || !token) return null;
  return { token, user, orgs: toOrgs(payload.orgs), confirmed: false };
}

class AccountAuth {
  private flow: PendingFlow | null = null;
  private session: StoredSession | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private loaded = false;

  constructor(private readonly deps: AuthDeps) {}

  install(ipc: Pick<Electron.IpcMain, "handle">): void {
    ipc.handle(ACCOUNT_IPC.get, (event) =>
      this.guard(event, () => this.view())
    );
    ipc.handle(ACCOUNT_IPC.signIn, (event) =>
      this.guard(event, () => this.signIn())
    );
    ipc.handle(ACCOUNT_IPC.confirm, (event) =>
      this.guard(event, () => this.confirm())
    );
    ipc.handle(ACCOUNT_IPC.signOut, (event) =>
      this.guard(event, () => this.signOut())
    );
  }

  private async guard(
    event: Electron.IpcMainInvokeEvent,
    run: () => AccountView | Promise<AccountView>
  ): Promise<AccountView> {
    const sender = event.sender;
    if (!this.deps.isStudio(sender) || event.senderFrame !== sender.mainFrame)
      return { user: null, orgs: [], state: "signed-out" };
    this.load();
    return run();
  }

  view(): AccountView {
    this.load();
    if (this.session) {
      return {
        user: this.session.user,
        orgs: this.session.orgs,
        state: this.session.confirmed ? "signed-in" : "needs-confirm",
      };
    }
    const state = this.hasFlow() ? "pending" : "signed-out";
    return { user: null, orgs: [], state };
  }

  private hasFlow(): boolean {
    if (!this.flow) return false;
    if (Date.now() > this.flow.expiresAt) {
      this.flow = null;
      return false;
    }
    return true;
  }

  private emit(): void {
    const view = this.view();
    for (const contents of this.deps.studioContents())
      if (!contents.isDestroyed()) contents.send(ACCOUNT_IPC.change, view);
  }

  async signIn(): Promise<AccountView> {
    const verifier = base64Url(randomBytes(48));
    const state = base64Url(randomBytes(32));
    this.flow = { verifier, state, expiresAt: Date.now() + FLOW_TTL_MS };
    const url = new URL("/sign-in/desktop", WEB_ORIGIN);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challengeFor(verifier));
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("redirect_uri", "designstudio://auth/callback");
    await shell.openExternal(url.toString());
    this.emit();
    return this.view();
  }

  handleCallback(raw: string): void {
    const flow = this.hasFlow() ? this.flow : null;
    const params = this.parseCallback(raw);
    if (!flow || !params || !sameSecret(params.state, flow.state)) {
      console.warn(
        `[desktop] dropped auth link ${raw.slice(0, 40)}: no valid pending flow`
      );
      return;
    }
    this.flow = null;
    this.deps.focusWindow();
    void this.finishSignIn(params.code, flow.verifier);
  }

  private parseCallback(raw: string): { code: string; state: string } | null {
    try {
      const url = new URL(raw);
      if (url.protocol !== "designstudio:" || url.hostname !== "auth")
        return null;
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      return code && state ? { code, state } : null;
    } catch {
      return null;
    }
  }

  private async finishSignIn(code: string, verifier: string): Promise<void> {
    try {
      const payload = await postJson(
        "/v1/auth/desktop/exchange",
        { code, code_verifier: verifier },
        null
      );
      const stored = toStored(payload);
      if (!stored) throw new Error("exchange returned no session");
      this.session = stored;
      this.persist();
    } catch (error) {
      console.warn(`[desktop] auth exchange failed: ${String(error)}`);
    }
    this.emit();
  }

  async confirm(): Promise<AccountView> {
    this.load();
    if (!this.session) return this.view();
    this.session.confirmed = true;
    this.persist();
    await this.mint();
    this.emit();
    return this.view();
  }

  async signOut(): Promise<AccountView> {
    this.load();
    this.session = null;
    this.flow = null;
    this.stopRefresh();
    this.deps.pushDeviceToken(null);
    rmSync(this.sessionPath(), { force: true });
    this.emit();
    return this.view();
  }

  private async mint(): Promise<void> {
    if (!this.session?.confirmed) return;
    try {
      const payload = await postJson(
        "/v1/auth/desktop/token",
        { aud: "device" },
        this.session.token
      );
      const token = isRecord(payload) ? payload.token : null;
      if (typeof token !== "string" || !token) throw new Error("no token");
      this.deps.pushDeviceToken(token);
      this.scheduleRefresh();
    } catch (error) {
      console.warn(`[desktop] device token mint failed: ${String(error)}`);
      this.deps.pushDeviceToken(null);
    }
  }

  private scheduleRefresh(): void {
    this.stopRefresh();
    this.refreshTimer = setTimeout(() => void this.mint(), JWT_REFRESH_MS);
    this.refreshTimer.unref();
  }

  private stopRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }

  private sessionPath(): string {
    const dir = this.deps.dataDir?.() ?? app.getPath("userData");
    return path.join(dir, SESSION_FILE);
  }

  private persist(): void {
    if (!this.session || !safeStorage.isEncryptionAvailable()) return;
    const file = this.sessionPath();
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(
      file,
      safeStorage.encryptString(JSON.stringify(this.session)),
      {
        mode: 0o600,
      }
    );
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    const file = this.sessionPath();
    if (!safeStorage.isEncryptionAvailable() || !existsSync(file)) return;
    try {
      const parsed: unknown = JSON.parse(
        safeStorage.decryptString(readFileSync(file))
      );
      const stored = toStored(
        isRecord(parsed) ? { ...parsed, session_token: parsed.token } : null
      );
      if (stored && isRecord(parsed)) {
        stored.confirmed = parsed.confirmed === true;
        this.session = stored;
        void this.mint();
      }
    } catch {
      rmSync(file, { force: true });
    }
  }
}

export { ACCOUNT_IPC, AccountAuth, CLOUD_ORIGIN, WEB_ORIGIN };
export type { AccountOrg, AccountUser, AccountView, AuthDeps };

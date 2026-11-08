import { copy } from "./copy.js";
import { desktopBridge } from "./deps.js";
import type { getCloud, WireOutput } from "./deps.js";

type CloudWire = WireOutput<typeof getCloud>;

type AccountPhase =
  | "expired"
  | "needs-confirm"
  | "pending"
  | "signed-in"
  | "signed-out";

interface AccountView {
  readonly orgs: CloudWire["orgs"];
  readonly phase: AccountPhase;
  readonly user: CloudWire["user"];
}

interface DesktopAccountView {
  readonly orgs: readonly { id: string; name: string; role: string }[];
  readonly state: string;
  readonly user: { id: string; email: string; name: string } | null;
}

interface DesktopAccount {
  readonly confirm: () => Promise<DesktopAccountView>;
  readonly get: () => Promise<DesktopAccountView>;
  readonly onChange: (
    handler: (view: DesktopAccountView) => void
  ) => () => void;
  readonly signIn: () => Promise<DesktopAccountView>;
  readonly signOut: () => Promise<DesktopAccountView>;
}

const SIGNED_OUT = "signed-out";

const PHASES: ReadonlySet<string> = new Set([
  "expired",
  "needs-confirm",
  "pending",
  "signed-in",
  SIGNED_OUT,
]);

const EMPTY_VIEW: AccountView = { orgs: [], phase: SIGNED_OUT, user: null };

const isPhase = (value: string): value is AccountPhase => PHASES.has(value);

const toPhase = (state: string): AccountPhase => {
  if (isPhase(state)) {
    return state;
  }

  return SIGNED_OUT;
};

const fromDesktop = (view: DesktopAccountView): AccountView => ({
  orgs: view.orgs,
  phase: toPhase(view.state),
  user: view.user,
});

const fromCloud = (view: CloudWire | null): AccountView => {
  if (view === null) {
    return EMPTY_VIEW;
  }

  return { orgs: view.orgs, phase: toPhase(view.state), user: view.user };
};

interface DesktopHost {
  readonly account?: DesktopAccount;
}

const readDesktopAccount = (): DesktopAccount | null => {
  const host = desktopBridge<DesktopHost>();

  return host?.account ?? null;
};

const needsConfirm = (view: AccountView): boolean =>
  view.phase === "needs-confirm" && view.user !== null;

const SETTINGS_COMMAND = "project.settings";

const toInitial = (user: AccountView["user"]): string | null => {
  const source = (user?.name ?? "").trim() || (user?.email ?? "").trim();

  if (source === "") {
    return null;
  }

  return source.slice(0, 1).toUpperCase();
};

const toUserLabel = (user: AccountView["user"]): string => {
  if (user === null) {
    return copy.signedOutLabel;
  }

  return user.email;
};

const openSettings = (): void => {
  globalThis.dispatchEvent(
    new CustomEvent("studio:command", { detail: SETTINGS_COMMAND })
  );
};

const toStatusText = (phase: AccountPhase): string => {
  if (phase === "expired") {
    return copy.expired;
  }

  if (phase === "pending") {
    return copy.pending;
  }

  return copy.signedOut;
};

export {
  EMPTY_VIEW,
  fromCloud,
  fromDesktop,
  needsConfirm,
  openSettings,
  readDesktopAccount,
  toInitial,
  toStatusText,
  toUserLabel,
};

export type { AccountPhase, AccountView, DesktopAccount, DesktopAccountView };

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { fromCloud, fromDesktop, readDesktopAccount } from "./account-model.js";
import type { AccountView, DesktopAccountView } from "./account-model.js";
import { copy } from "./copy.js";
import { getCloudRoute, useAction } from "./deps.js";

interface AccountState {
  readonly cancel: () => void;
  readonly confirm: () => void;
  readonly error: string | null;
  readonly isPending: boolean;
  readonly signIn: () => void;
  readonly signOut: () => void;
  readonly view: AccountView;
}

type Step = () => Promise<DesktopAccountView> | null;

const idle = (): null => null;

const useAccount = (): AccountState => {
  const cloud = useAction(getCloudRoute, {});
  const [desktopView, setDesktopView] = useState<AccountView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const account = readDesktopAccount();

    if (account === null) {
      return idle;
    }

    const stop = account.onChange((next) => {
      setDesktopView(fromDesktop(next));
    });

    startTransition(async () => {
      try {
        setDesktopView(fromDesktop(await account.get()));
      } catch {
        setError(copy.failed);
      }
    });

    return stop;
  }, []);

  const step = useCallback((pick: Step): void => {
    startTransition(async () => {
      try {
        const task = pick();

        if (task !== null) {
          setDesktopView(fromDesktop(await task));
        }

        setError(null);
      } catch {
        setError(copy.failed);
      }
    });
  }, []);

  const signIn = useCallback((): void => {
    step(() => readDesktopAccount()?.signIn() ?? null);
  }, [step]);

  const confirm = useCallback((): void => {
    step(() => readDesktopAccount()?.confirm() ?? null);
  }, [step]);

  const signOut = useCallback((): void => {
    step(() => readDesktopAccount()?.signOut() ?? null);
  }, [step]);

  const view = useMemo(
    () => desktopView ?? fromCloud(cloud.data),
    [cloud.data, desktopView]
  );

  return {
    cancel: signOut,
    confirm,
    error,
    isPending,
    signIn,
    signOut,
    view,
  };
};

export { useAccount };

export type { AccountState };

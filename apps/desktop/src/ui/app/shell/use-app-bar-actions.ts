import { useCallback, useTransition } from "react";
import type { Dispatch, SetStateAction } from "react";

import { api } from "../../api";
import { pick } from "../../platform/pick.js";
import type { Tab } from "./app-tabs";

interface AppBarActionsInput {
  readonly isManaged: boolean;
  readonly projectId: string;
  readonly refresh: () => void;
  readonly remember: () => void;
  readonly setOpen: Dispatch<SetStateAction<boolean>>;
  readonly setTab: (tab: Tab) => void;
}

interface AppBarActions {
  readonly retry: () => void;
  readonly showLog: () => void;
  readonly toggle: () => void;
}

const useAppBarActions = ({
  isManaged,
  projectId,
  refresh,
  remember,
  setOpen,
  setTab,
}: AppBarActionsInput): AppBarActions => {
  const [, startTransition] = useTransition();

  const retry = useCallback((): void => {
    startTransition(async () => {
      try {
        await api.appControl(projectId, pick(isManaged, "restart", "start"));
        refresh();
      } catch {
        refresh();
      }
    });
  }, [isManaged, projectId, refresh]);

  const showLog = useCallback((): void => {
    setTab("logs");
    setOpen(true);
  }, [setOpen, setTab]);

  const toggle = useCallback((): void => {
    remember();
    setOpen((isOpen) => !isOpen);
  }, [remember, setOpen]);

  return { retry, showLog, toggle };
};

export { useAppBarActions };

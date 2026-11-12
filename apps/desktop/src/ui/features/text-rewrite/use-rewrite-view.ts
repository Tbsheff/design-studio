import { useCallback, useState } from "react";
import type { RefObject } from "react";

import { useFitPopover, usePopover } from "./deps.js";
import type { RewriteMode, View } from "./text-rewrite-model.js";
import type { TextRewrite } from "./use-text-rewrite.js";

interface RewriteView {
  readonly handleApply: () => void;
  readonly handleCancel: () => void;
  readonly handleLanguage: (code: string) => void;
  readonly handleLanguages: () => void;
  readonly handleMenu: () => void;
  readonly handleMode: (mode: RewriteMode) => void;
  readonly handleToggle: () => void;
  readonly isOpen: boolean;
  readonly view: View;
}

const useRewriteView = (
  rewrite: TextRewrite,
  root: RefObject<HTMLDivElement | null>,
  trigger: RefObject<HTMLButtonElement | null>
): RewriteView => {
  const [view, setView] = useState<View>("closed");
  const isOpen = view !== "closed";
  const { apply, reset, run } = rewrite;

  const close = useCallback(
    (refocus: boolean): void => {
      setView("closed");

      if (refocus) {
        trigger.current?.focus();
      }
    },
    [trigger]
  );

  usePopover(isOpen, root, close, trigger);
  useFitPopover(root, trigger, isOpen);

  const handleToggle = useCallback((): void => {
    setView((now) => {
      if (now === "closed") {
        return "menu";
      }

      return "closed";
    });
  }, []);

  const handleMode = useCallback(
    (mode: RewriteMode): void => {
      run(mode, null);
      setView("options");
    },
    [run]
  );

  const handleLanguage = useCallback(
    (code: string): void => {
      run("translate", code);
      setView("options");
    },
    [run]
  );

  const handleLanguages = useCallback((): void => {
    setView("languages");
  }, []);

  const handleMenu = useCallback((): void => {
    setView("menu");
  }, []);

  const handleApply = useCallback((): void => {
    apply();
    setView("closed");
  }, [apply]);

  const handleCancel = useCallback((): void => {
    reset();
    setView("closed");
  }, [reset]);

  return {
    handleApply,
    handleCancel,
    handleLanguage,
    handleLanguages,
    handleMenu,
    handleMode,
    handleToggle,
    isOpen,
    view,
  };
};

export { useRewriteView };

export type { RewriteView };

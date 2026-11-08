import type { SelectionContext } from "@design-studio/contracts";
import type {
  EditScope,
  InlineRunExtras,
} from "@design-studio/contracts/usage-scope";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { matchesKey } from "../../../shared/keymap.js";
import { IS_MAC, useCommands } from "../../chat-slots.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { unionRect } from "../canvas/use-canvas-frames.js";

const INLINE_PROMPT_COMMAND = "selection.ask-inline";

interface InlinePromptOptions {
  selection: SelectionContext[];
  live: boolean;
  running: boolean | undefined;
  onSubmit:
    | ((prompt: string, extras?: InlineRunExtras) => void)
    | null
    | undefined;
  stage: () => HTMLElement | null;
  route?: string | null | undefined;
}

interface InlinePromptView {
  rect: NonNullable<ReturnType<typeof unionRect>>;
  label: string;
  blocked: string | null;
  usageFile: string | null;
  usedAtFile: string | null;
  route: string | null;
  submit: (prompt: string, editScope?: EditScope) => void;
  close: () => void;
}

const blockerOf = (options: InlinePromptOptions): string | null => {
  if (!options.onSubmit) {
    return "Open a direction first";
  }

  if (!options.live) {
    return "Go back to the live canvas first";
  }

  if (options.selection.length === 0) {
    return "Select an element first";
  }

  if (options.running) {
    return "Wait for the current run to finish";
  }

  return null;
};

const SNIPPET_MAX = 16;
const INLINE_PROMPT_OPEN_EVENT = "studio:inline-prompt-open";

const labelOf = (selection: SelectionContext[]): string => {
  const last = selection.at(-1);

  if (selection.length > 1) {
    return `${selection.length} elements`;
  }

  if (last?.component) {
    return last.component;
  }

  const text = last?.text.replaceAll(/\s+/gu, " ").trim() ?? "";

  let snippet: string = text;

  if (text.length > SNIPPET_MAX) {
    snippet = `${text.slice(0, SNIPPET_MAX - 1)}…`;
  }

  if (snippet) {
    return `“${snippet}”`;
  }

  return last?.tag || "element";
};

const usageFileOf = (selection: SelectionContext[]): string | null => {
  if (selection.length === 1) {
    return selection[0]?.source?.file ?? null;
  }

  return null;
};

const usedAtFileOf = (selection: SelectionContext[]): string | null => {
  if (selection.length === 1) {
    return selection[0]?.usedAt?.file ?? null;
  }

  return null;
};

const restoreFocus = (
  previous: Element | null,
  stage: HTMLElement | null
): void => {
  let target: HTMLElement | null = stage;

  if (
    previous instanceof HTMLElement &&
    previous.isConnected &&
    previous !== document.body
  ) {
    target = previous;
  }

  target?.focus({ preventScroll: true });
};

interface InlineKeyOptions {
  readonly latest: { readonly current: InlinePromptOptions };
  readonly show: () => void;
}

const useInlineShortcut = ({ latest, show }: InlineKeyOptions): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        isTypingTarget(event.target)
      ) {
        return;
      }

      if (
        !matchesKey("inline-prompt", event, IS_MAC) ||
        latest.current.selection.length === 0
      ) {
        return;
      }

      event.preventDefault();
      show();
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, [show, latest]);
};

const useInlineCommand = (show: () => void, hasSelection: boolean): void => {
  useCommands(() => {
    const command = {
      group: "Run",
      icon: "chat",
      id: INLINE_PROMPT_COMMAND,
      keyId: "inline-prompt",
      keywords: "inline prompt quick edit selection element",
      run: show,
      title: "Ask the agent at the selection",
    } as const;

    if (hasSelection) {
      return [command];
    }

    return [{ ...command, disabled: "Select an element first" }];
  });
};

const toExtras = (editScope: EditScope | undefined): InlineRunExtras => {
  if (editScope) {
    return { editScope, lean: true };
  }

  return { lean: true };
};

const useInlinePrompt = (
  options: InlinePromptOptions
): InlinePromptView | null => {
  const [open, setOpen] = useState(false);
  const returnTo = useRef<Element | null>(null);
  const latest = useRef(options);

  useLayoutEffect(() => {
    latest.current = options;
  });

  const show = useCallback(() => {
    const cur = latest.current;

    if (cur.selection.length === 0 || !cur.live) {
      return;
    }

    returnTo.current = document.activeElement;
    setOpen(true);
    globalThis.dispatchEvent(new Event(INLINE_PROMPT_OPEN_EVENT));
  }, [latest]);

  const close = useCallback(() => {
    setOpen(false);
    restoreFocus(returnTo.current, latest.current.stage());
  }, [latest]);

  const submit = useCallback(
    (prompt: string, editScope?: EditScope) => {
      const cur = latest.current;

      if (blockerOf(cur) || !prompt.trim()) {
        return;
      }

      cur.onSubmit?.(prompt.trim(), toExtras(editScope));
      close();
    },
    [latest, close]
  );

  useInlineShortcut({ latest, show });
  useInlineCommand(show, options.selection.length > 0);

  const isEmpty = options.selection.length === 0 || !options.live;

  if (isEmpty && open) {
    setOpen(false);
  }

  const rect = unionRect(options.selection);

  if (!open || !rect || !options.live) {
    return null;
  }

  const blocked = blockerOf(options);
  const label = labelOf(options.selection);
  const route = options.route ?? null;
  const usageFile = usageFileOf(options.selection);
  const usedAtFile = usedAtFileOf(options.selection);

  return { blocked, close, label, rect, route, submit, usageFile, usedAtFile };
};

export { INLINE_PROMPT_COMMAND, INLINE_PROMPT_OPEN_EVENT, useInlinePrompt };

export type { InlinePromptOptions, InlinePromptView };

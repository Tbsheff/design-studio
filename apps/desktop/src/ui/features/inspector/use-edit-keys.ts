import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { toEditChord, toEditKey } from "../../../shared/edit-keys.js";
import type { EditKey, TypeProp } from "../../../shared/edit-keys.js";
import type { KeyId } from "../../../shared/keymap.js";
import { PREVIEW_ARRANGE_KEY_EVENT } from "../../platform/preview-key-events.js";
import { canvasHasKeys } from "../../platform/typing-target.js";
import { editKeysCopy } from "./copy.js";
import { useCommands } from "./deps.js";
import type { DirectEdit } from "./deps.js";
import {
  SEQUENCE_MS,
  toNextDigits,
  toOpacityValue,
  toTypeValue,
} from "./edit-keys-model.js";
import type { DigitRun } from "./edit-keys-model.js";
import { useLatestRef } from "./use-latest-ref.js";

interface EditKeyTarget {
  readonly edit: DirectEdit;
  readonly isTailwind: boolean;
}

interface DigitState {
  readonly run: RefObject<DigitRun | null>;
  readonly timer: RefObject<ReturnType<typeof setTimeout> | null>;
}

type CommandEntry = ReturnType<Parameters<typeof useCommands>[0]>[number];

type TypeKey = Extract<EditKey, { readonly kind: "type" }>;

const OPACITY_DIGITS: readonly string[] = [
  "00",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
];

const PERCENT = 100;

const TYPE_COMMANDS: readonly {
  readonly id: string;
  readonly key: TypeKey;
  readonly keyId: KeyId;
  readonly title: string;
}[] = [
  {
    id: "selection.font-size-up",
    key: { kind: "type", prop: "font-size", step: 1 },
    keyId: "font-size-up",
    title: editKeysCopy.fontSizeUp,
  },
  {
    id: "selection.font-size-down",
    key: { kind: "type", prop: "font-size", step: -1 },
    keyId: "font-size-down",
    title: editKeysCopy.fontSizeDown,
  },
  {
    id: "selection.letter-spacing-up",
    key: { kind: "type", prop: "letter-spacing", step: 1 },
    keyId: "letter-spacing-up",
    title: editKeysCopy.letterSpacingUp,
  },
  {
    id: "selection.letter-spacing-down",
    key: { kind: "type", prop: "letter-spacing", step: -1 },
    keyId: "letter-spacing-down",
    title: editKeysCopy.letterSpacingDown,
  },
  {
    id: "selection.line-height-up",
    key: { kind: "type", prop: "line-height", step: 1 },
    keyId: "line-height-up",
    title: editKeysCopy.lineHeightUp,
  },
  {
    id: "selection.line-height-down",
    key: { kind: "type", prop: "line-height", step: -1 },
    keyId: "line-height-down",
    title: editKeysCopy.lineHeightDown,
  },
];

const stopDigitTimer = (state: DigitState): void => {
  if (state.timer.current !== null) {
    clearTimeout(state.timer.current);
    state.timer.current = null;
  }
};

const applyPendingDigits = (
  state: DigitState,
  target: RefObject<EditKeyTarget>
): void => {
  if (state.timer.current !== null) {
    stopDigitTimer(state);
    target.current.edit.commit();
  }
};

const setOpacity = (edit: DirectEdit, digits: string): void => {
  edit.preview({ opacity: toOpacityValue(digits) });
};

const runDigit = (
  target: RefObject<EditKeyTarget>,
  state: DigitState,
  digit: string
): void => {
  const run = toNextDigits(state.run.current, digit, performance.now());
  state.run.current = run;
  stopDigitTimer(state);
  setOpacity(target.current.edit, run.digits);

  if (run.digits.length > 1) {
    state.run.current = null;
    target.current.edit.commit();

    return;
  }

  state.timer.current = setTimeout(() => {
    state.timer.current = null;
    target.current.edit.commit();
  }, SEQUENCE_MS);
};

const toTypePatch = (
  target: EditKeyTarget,
  prop: TypeProp,
  step: number
): Partial<Record<TypeProp, string>> | null => {
  const next = toTypeValue(
    prop,
    target.edit.values,
    step,
    target.isTailwind || target.edit.tailwind?.mode === "classes"
  );

  if (next === null) {
    return null;
  }

  return { [prop]: next };
};

const runTypeKey = (target: EditKeyTarget, key: TypeKey): void => {
  const patch = toTypePatch(target, key.prop, key.step);

  if (patch !== null) {
    target.edit.previewForced(patch);
    target.edit.commitSoon();
  }
};

const runEditKey = (
  target: RefObject<EditKeyTarget>,
  state: DigitState,
  key: EditKey
): void => {
  if (key.kind === "opacity") {
    runDigit(target, state, key.digit);

    return;
  }

  runTypeKey(target.current, key);
};

const toOpacityTitle = (digits: string): string =>
  `${editKeysCopy.opacity} ${Math.round(Number(toOpacityValue(digits)) * PERCENT)}%`;

const toEditCommands = (target: RefObject<EditKeyTarget>): CommandEntry[] => [
  ...OPACITY_DIGITS.map((digits) => ({
    group: "Selection",
    id: `selection.opacity-${digits}`,
    keyId: "opacity-keys" as const,
    keywords: editKeysCopy.opacityKeywords,
    run: (): void => {
      setOpacity(target.current.edit, digits);
      target.current.edit.commit();
    },
    title: toOpacityTitle(digits),
  })),
  ...TYPE_COMMANDS.map((entry) => ({
    group: "Selection",
    id: entry.id,
    keyId: entry.keyId,
    keywords: editKeysCopy.typeKeywords,
    run: (): void => runTypeKey(target.current, entry.key),
    title: entry.title,
  })),
];

const toPressedKey = (event: KeyboardEvent): EditKey | null => {
  if (!canvasHasKeys()) {
    return null;
  }

  return toEditKey(toEditChord(event));
};

const toForwardedKey = (event: Event): EditKey | null =>
  toEditKey(
    (event as CustomEvent<{ readonly key?: string }>).detail?.key ?? null
  );

const isRootShown = (root: RefObject<HTMLElement | null>): boolean =>
  root.current !== null &&
  root.current.checkVisibility() &&
  root.current.closest("[inert]") === null;

const useEditKeys = (
  edit: DirectEdit,
  isTailwind: boolean
): RefObject<HTMLElement | null> => {
  const root = useRef<HTMLElement | null>(null);
  const target = useLatestRef<EditKeyTarget>({ edit, isTailwind });
  const run = useRef<DigitRun | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const state: DigitState = { run, timer };

    const onKey = (event: KeyboardEvent): void => {
      const key = toPressedKey(event);

      if (key && isRootShown(root)) {
        event.preventDefault();
        runEditKey(target, state, key);
      }
    };

    const onForwarded = (event: Event): void => {
      const key = toForwardedKey(event);

      if (key && isRootShown(root)) {
        runEditKey(target, state, key);
      }
    };

    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);
      applyPendingDigits(state, target);
    };
  }, [target]);

  useCommands(() => toEditCommands(target));

  return root;
};

export { useEditKeys };

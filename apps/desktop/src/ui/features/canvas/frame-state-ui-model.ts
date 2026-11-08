import type { FrameStateDef } from "@design-studio/contracts/frame-state";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import { isText } from "../../platform/json-guard.js";
import { toMenuItems } from "./menu-items-model.js";

type MockRules = NonNullable<FrameStateDef["mocks"]>;

type Panel = "list" | "user" | "mock";

const toFormText = (data: FormData, key: string): string => {
  const value = data.get(key);

  if (isText(value)) {
    return value;
  }

  return "";
};

const stop = (eventValue: ReactPointerEvent): void =>
  eventValue.stopPropagation();

const MOCK_EXAMPLE = '[\n  { "path": "/api/items", "body": [] }\n]';

const menuKeys = (event: ReactKeyboardEvent<HTMLElement>): void => {
  const items = toMenuItems(event.currentTarget);

  const index = items.indexOf(document.activeElement as HTMLButtonElement);

  const next: number | null = ((): number | null => {
    if (event.key === "ArrowDown") {
      return index + 1;
    }

    if (event.key === "ArrowUp") {
      return index - 1;
    }

    return null;
  })();

  if (next === null || items.length === 0) {
    return;
  }

  event.preventDefault();
  items[(next + items.length) % items.length]?.focus();
};

export { MOCK_EXAMPLE, menuKeys, stop, toFormText };

export type { MockRules, Panel };

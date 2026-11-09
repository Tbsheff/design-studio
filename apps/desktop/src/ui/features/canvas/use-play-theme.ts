import type { BridgeToParent } from "@design-studio/contracts";
import { useState } from "react";
import type { RefObject } from "react";

import { postToFrame, useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import {
  readStored,
  removeStored,
  writeStored,
} from "../../platform/storage.js";
import { useLatest } from "../../platform/use-latest.js";
import type { PlayModeProps, Slot } from "./play-model.js";

const THEME_KEY_PREFIX = "design-studio.play-theme.";
const THEME_DARK = "dark";

interface PlayTheme {
  readonly isDark: boolean;
  readonly onToggle: () => void;
}

interface PlayThemeInput {
  readonly elements: RefObject<Record<string, HTMLIFrameElement | null>>;
  readonly props: PlayModeProps;
  readonly slots: Slot[];
}

const toThemeKey = (projectId: string): string =>
  `${THEME_KEY_PREFIX}${projectId}`;

const toThemeFrame = (input: PlayThemeInput, slot: Slot): BridgeFrame => ({
  element: input.elements.current[slot.token] ?? null,
  key: slot.token,
  kind: input.props.kind,
  token: slot.token,
  url: slot.src,
});

const toThemeChoice = (isDark: boolean): "dark" | null => {
  if (isDark) {
    return THEME_DARK;
  }

  return null;
};

const sendTheme = (frame: BridgeFrame, isDark: boolean): void => {
  postToFrame(frame, { theme: toThemeChoice(isDark), type: "set-theme" });
};

const usePlayTheme = (input: PlayThemeInput): PlayTheme => {
  const { projectId } = input.props;

  const [isDark, setIsDark] = useState<boolean>(
    () => readStored(toThemeKey(projectId)) === THEME_DARK
  );

  const latest = useLatest(input);
  const darkRef = useLatest(isDark);

  useBridge(
    () =>
      latest.current.slots.map((slot) => toThemeFrame(latest.current, slot)),
    (frame, message: BridgeToParent) => {
      if (message.type === "ready" && darkRef.current) {
        sendTheme(frame, true);
      }
    }
  );

  const onToggle = (): void => {
    const next = !isDark;

    setIsDark(next);

    if (next) {
      writeStored(toThemeKey(projectId), THEME_DARK);
    } else {
      removeStored(toThemeKey(projectId));
    }

    for (const slot of input.slots) {
      sendTheme(toThemeFrame(input, slot), next);
    }
  };

  return { isDark, onToggle };
};

export { usePlayTheme };

export type { PlayTheme };

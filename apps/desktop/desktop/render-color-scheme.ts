import type { WebContents } from "electron";

import type { RenderColorScheme } from "../src/shared/render-rpc.js";

interface MediaFeature {
  readonly name: string;
  readonly value: string;
}

const applyColorScheme = async (
  contents: WebContents,
  colorScheme: RenderColorScheme | null
): Promise<void> => {
  const features: MediaFeature[] = [];

  if (colorScheme !== null) {
    features.push({ name: "prefers-color-scheme", value: colorScheme });
  }

  await contents.debugger.sendCommand("Emulation.setEmulatedMedia", {
    features,
  });
};

export { applyColorScheme };

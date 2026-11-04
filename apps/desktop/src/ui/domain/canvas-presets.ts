import type { IconName } from "@design-studio/ui";

type PresetId = "custom" | "desktop" | "mobile" | "tablet";

interface ViewportPreset {
  readonly height: number;
  readonly icon: IconName;
  readonly id: PresetId;
  readonly label: string;
  readonly width: number;
}

type CanvasSource =
  | { readonly kind: "last" }
  | { readonly kind: "live" }
  | {
      readonly kind: "version";
      readonly title: string;
      readonly versionId: string;
    };

const DESKTOP_WIDTH = 1440;

const DESKTOP_HEIGHT = 900;

const TABLET_WIDTH = 768;

const TABLET_HEIGHT = 1024;

const MOBILE_WIDTH = 390;

const MOBILE_HEIGHT = 844;

const PRESETS: readonly ViewportPreset[] = [
  {
    height: DESKTOP_HEIGHT,
    icon: "desktop",
    id: "desktop",
    label: "Desktop 1440",
    width: DESKTOP_WIDTH,
  },
  {
    height: TABLET_HEIGHT,
    icon: "tablet",
    id: "tablet",
    label: "Tablet 768",
    width: TABLET_WIDTH,
  },
  {
    height: MOBILE_HEIGHT,
    icon: "mobile",
    id: "mobile",
    label: "Mobile 390",
    width: MOBILE_WIDTH,
  },
];

export { PRESETS };

export type { CanvasSource, ViewportPreset };

import type { Oklch } from "culori";

const V3 = 3;

const V4 = 4;

type TailwindVersion = typeof V3 | typeof V4;

type ThemeNamespace =
  | "color"
  | "spacing"
  | "text"
  | "radius"
  | "font-weight"
  | "leading"
  | "tracking"
  | "shadow"
  | "font";

interface ThemeColor {
  name: string;
  color: Oklch | null;
  project: boolean;
  rank: number;
}

interface TailwindTheme {
  version: TailwindVersion;
  spacingPx: number;
  spacing: Map<string, number>;
  text: Map<string, number>;
  radius: Map<string, number>;
  fontWeight: Map<string, number>;
  leading: Map<string, number>;
  tracking: Map<string, number>;
  shadow: Map<string, string>;
  font: Map<string, string>;
  colors: ThemeColor[];
  colorNames: Set<string>;
  vars: Map<string, { ns: ThemeNamespace; name: string }>;
  breakpoints: Map<string, number>;
}

export type { TailwindTheme, TailwindVersion, ThemeColor, ThemeNamespace };

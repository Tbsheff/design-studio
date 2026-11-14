import type { ThemeMood } from "./types.js";

interface HueName {
  readonly name: string;
  readonly upTo: number;
}

const HUE_NAMES: readonly HueName[] = [
  { name: "Rose", upTo: 15 },
  { name: "Red", upTo: 40 },
  { name: "Amber", upTo: 85 },
  { name: "Lime", upTo: 125 },
  { name: "Green", upTo: 165 },
  { name: "Teal", upTo: 200 },
  { name: "Cyan", upTo: 230 },
  { name: "Blue", upTo: 265 },
  { name: "Indigo", upTo: 290 },
  { name: "Violet", upTo: 330 },
  { name: "Rose", upTo: 360 },
];

const MOOD_NAMES: Readonly<Record<ThemeMood, string>> = {
  mono: "Mono",
  project: "Project",
  rounded: "Rounded",
  sans: "Sans",
  serif: "Serif",
};

const toHueName = (hue: number): string =>
  HUE_NAMES.find((entry) => hue < entry.upTo)?.name ?? "Rose";

const toThemeName = (
  hue: number,
  mood: ThemeMood,
  family: string | null
): string => `${toHueName(hue)} ${family ?? MOOD_NAMES[mood]}`;

export { toThemeName };

export interface LiveStyle {
  color: string;
  bg: string;
  font: string;
  size: string;
  weight: string;
  radius: string;
  shadow: string;
  borderColor: string;
  borderWidth: string;
  text: number;
}

export interface LiveFontFace {
  family: string;
  src: string;
  weight: string;
  loaded: boolean;
}

export interface LiveSheet {
  url: string;
  css: string;
}

export interface LivePage {
  title: string;
  text: string;
  textLength: number;
  hasPassword: boolean;
  darkHint: boolean;
  themeColor: string | null;
  fontLinks: string[];
  docHeight: number;
  roles: Record<string, LiveStyle[]>;
  cards: LiveStyle[];
  painted: [string, number][];
  inks: [string, number][];
  borders: [string, number][];
  radii: [string, number][];
  shadows: [string, number][];
  gaps: [number, number][];
  families: [string, number][];
  fontFaces: LiveFontFace[];
  vars: Record<string, string>;
  bodyVars: Record<string, string>;
  sheets: LiveSheet[];
  crossOrigin: string[];
  logo: { alt: string; kind: string; width: number; height: number } | null;
  elements: number;
}

export { COLLECT_SCRIPT } from "./browser-collect.probe.js";

import { PROBE_SOURCE } from "./probe.probe.js";

interface ProbeInput {
  readonly max: number;
  readonly root: string | null;
}

interface RawNode {
  readonly loc: string | null;
  readonly name: string;
  readonly nameFrom: string;
  readonly role: string;
  readonly selector: string;
  readonly tag: string;
}

interface RawTab extends RawNode {
  readonly tabIndex: number;
}

interface RawImage {
  readonly loc: string | null;
  readonly selector: string;
  readonly src: string;
  readonly tag: string;
}

interface RawText {
  readonly background: string | null;
  readonly foreground: string;
  readonly large: boolean;
  readonly loc: string | null;
  readonly selector: string;
  readonly tag: string;
  readonly text: string;
}

interface RawProbe {
  readonly images: readonly RawImage[];
  readonly missingRoot: boolean;
  readonly root: RawNode | null;
  readonly tabs: readonly RawTab[];
  readonly texts: readonly RawText[];
  readonly truncated: boolean;
  readonly unnamed: readonly RawNode[];
}

const accessibilityProbe = (input: ProbeInput): string =>
  `(${PROBE_SOURCE})(${JSON.stringify(input)})`;

export { accessibilityProbe };

export type { ProbeInput, RawImage, RawNode, RawProbe, RawTab, RawText };

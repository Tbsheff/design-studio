import type { Page } from "playwright-core";

type FindingKind =
  | "clipped"
  | "overlap"
  | "sideways-scroll"
  | "text-overflow"
  | "unreachable";

interface BoxRect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface PageFinding {
  readonly amount: number;
  readonly detail: string;
  readonly kind: FindingKind;
  readonly rect: BoxRect | null;
  readonly selector: string;
  readonly text: string;
}

interface Finding extends PageFinding {
  readonly crop: string | null;
  readonly key: string;
  readonly mode: string;
  readonly state: string;
  readonly states: string[];
}

interface ClipRun {
  readonly cropDir: string;
  readonly findings: Map<string, Finding>;
  readonly menus: Set<string>;
  readonly mode: string;
  readonly origin: string;
  readonly page: Page;
  readonly tips: Set<string>;
}

interface ClipState {
  readonly close: (page: Page) => Promise<void>;
  readonly name: string;
  readonly open: (page: Page) => Promise<boolean>;
}

const FINDING_KINDS: readonly FindingKind[] = [
  "clipped",
  "text-overflow",
  "overlap",
  "sideways-scroll",
  "unreachable",
];

export { FINDING_KINDS };

export type { BoxRect, ClipRun, ClipState, Finding, FindingKind, PageFinding };

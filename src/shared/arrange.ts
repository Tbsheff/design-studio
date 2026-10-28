import type { SourceLoc, Version } from './contracts.js';

export const ALIGN_OPS = ['left', 'center', 'right', 'top', 'middle', 'bottom'] as const;
export const DISTRIBUTE_OPS = ['horizontal', 'vertical'] as const;
export type AlignOp = (typeof ALIGN_OPS)[number];
export type DistributeOp = (typeof DISTRIBUTE_OPS)[number];

export type ArrangeAction = { align: AlignOp } | { distribute: DistributeOp } | { tidy: true };

export interface ArrangeTarget {
  selector: string;
}

export interface ArrangeRequest {
  targets: ArrangeTarget[];
  action: ArrangeAction;
  path?: string;
  viewport?: { width: number; height: number };
}

export type ArrangeMode = 'auto-layout' | 'self' | 'absolute' | 'add-auto-layout';

export interface ArrangeWrite {
  selector: string;
  tag: string;
  source: SourceLoc;
  style: Record<string, string | null>;
}

export interface ArrangeResult {
  changed: boolean;
  mode: ArrangeMode;
  writes: ArrangeWrite[];
  files: string[];
  classes: string[];
  version: Version | null;
  note: string | null;
}

export interface MeasureRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MeasureResult {
  a: MeasureRect;
  b: MeasureRect;
  relation: 'apart' | 'overlap' | 'a-inside-b' | 'b-inside-a';
  gap: { horizontal: number | null; vertical: number | null };
  inside: { top: number; right: number; bottom: number; left: number } | null;
  centers: { dx: number; dy: number };
  lines: { axis: 'x' | 'y'; from: number; to: number; at: number; value: number }[];
}

export const ARRANGE_SHORTCUTS: Record<string, ArrangeAction> = {
  'Alt+KeyA': { align: 'left' },
  'Alt+KeyH': { align: 'center' },
  'Alt+KeyD': { align: 'right' },
  'Alt+KeyW': { align: 'top' },
  'Alt+KeyV': { align: 'middle' },
  'Alt+KeyS': { align: 'bottom' },
  'Alt+Shift+KeyH': { distribute: 'horizontal' },
  'Alt+Shift+KeyV': { distribute: 'vertical' },
  'Ctrl+Alt+KeyT': { tidy: true },
};

export function arrangeLabel(action: ArrangeAction): string {
  if ('align' in action) return `Align ${action.align}`;
  if ('distribute' in action) return `Distribute ${action.distribute} spacing`;
  return 'Tidy up';
}

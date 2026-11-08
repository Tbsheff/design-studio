interface AttentionRgb {
  readonly blue: number;
  readonly green: number;
  readonly red: number;
}

interface AttentionBox {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface AttentionElement {
  readonly background: AttentionRgb | null;
  readonly backdrop: AttentionRgb | null;
  readonly box: AttentionBox;
  readonly color: AttentionRgb | null;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly isInteractive: boolean;
  readonly isPrimaryCandidate: boolean;
  readonly label: string;
  readonly layerId: string | null;
  readonly role: string;
  readonly selector: string;
  readonly textLength: number;
}

interface AttentionImage {
  readonly height: number;
  readonly rgba: Uint8Array;
  readonly width: number;
}

interface AttentionInput {
  readonly elements: readonly AttentionElement[];
  readonly image: AttentionImage;
  readonly scope: AttentionBox | null;
}

interface AttentionGrid {
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  readonly values: Float64Array;
}

interface RankedElement {
  readonly element: AttentionElement;
  readonly rank: number;
  readonly share: number;
}

type AttentionNoteKind =
  | "competing-focal-points"
  | "low-contrast-primary"
  | "primary-not-in-top-3"
  | "text-wall";

interface AttentionNoteDraft {
  readonly kind: AttentionNoteKind;
  readonly layerId: string | null;
  readonly message: string;
}

interface AttentionMap {
  readonly clarityScore: number;
  readonly grid: AttentionGrid;
  readonly notes: readonly AttentionNoteDraft[];
  readonly ranked: readonly RankedElement[];
}

interface AttentionRefused {
  readonly code: "empty_image" | "no_elements";
  readonly isOk: false;
}

interface AttentionDone {
  readonly isOk: true;
  readonly value: AttentionMap;
}

type AttentionOutcome = AttentionDone | AttentionRefused;

export type {
  AttentionBox,
  AttentionDone,
  AttentionElement,
  AttentionGrid,
  AttentionImage,
  AttentionInput,
  AttentionMap,
  AttentionNoteDraft,
  AttentionNoteKind,
  AttentionOutcome,
  AttentionRefused,
  AttentionRgb,
  RankedElement,
};

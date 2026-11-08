interface CapturedNode {
  readonly tag: string;
  readonly svg: boolean;
  readonly attrs: readonly (readonly [string, string])[];
  readonly style: Readonly<Record<string, string>> | null;
  readonly children: readonly (CapturedNode | string)[];
}

interface CapturedFace {
  readonly family: string;
  readonly css: string;
}

interface CapturedPage {
  readonly ok: true;
  readonly title: string;
  readonly lang: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly root: CapturedNode | null;
  readonly fontFaces: readonly CapturedFace[];
  readonly families: readonly string[];
  readonly nodes: number;
  readonly truncated: boolean;
  readonly removed: Readonly<Record<string, number>>;
}

interface CaptureFailure {
  readonly ok: false;
  readonly error: string;
}

interface Capture {
  readonly page: CapturedPage;
  readonly kept: ReadonlyMap<string, Buffer>;
  readonly refused: readonly string[];
}

export type {
  Capture,
  CaptureFailure,
  CapturedFace,
  CapturedNode,
  CapturedPage,
};

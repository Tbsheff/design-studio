interface Splice {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

interface SpliceDone {
  readonly ok: true;
  readonly source: string;
}

interface SpliceRefused {
  readonly code: "overlap" | "out_of_range";
  readonly ok: false;
}

type SpliceResult = SpliceDone | SpliceRefused;

const byStartDesc = (left: Splice, right: Splice): number =>
  right.start - left.start;

const overlaps = (ordered: readonly Splice[]): boolean =>
  ordered.slice(1).some((later, index) => {
    const earlier = ordered[index];

    return Boolean(earlier) && later.end > (earlier?.start ?? 0);
  });

const outOfRange = (source: string, splices: readonly Splice[]): boolean =>
  splices.some((splice) => splice.start < 0 || splice.end > source.length);

const applySplices = (
  source: string,
  splices: readonly Splice[]
): SpliceResult => {
  const ordered = splices.toSorted(byStartDesc);

  if (outOfRange(source, ordered)) {
    return { code: "out_of_range", ok: false };
  }

  if (overlaps(ordered)) {
    return { code: "overlap", ok: false };
  }

  let output = source;

  for (const splice of ordered) {
    output =
      output.slice(0, splice.start) + splice.text + output.slice(splice.end);
  }

  return { ok: true, source: output };
};

export { applySplices };

export type { Splice, SpliceResult };

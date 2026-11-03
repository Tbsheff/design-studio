type CellScheme = "dark" | "light";

type SchemeChoice = CellScheme | "both";

interface MatrixCell {
  readonly height: number;
  readonly label: string;
  readonly scheme: CellScheme;
  readonly width: number;
}

interface MatrixRequest {
  readonly schemes: SchemeChoice;
  readonly widths: readonly number[];
}

const DEFAULT_WIDTHS: readonly number[] = [375, 768, 1280];

const PHONE_MAX = 480;

const TABLET_MAX = 1024;

const PHONE_HEIGHT = 812;

const TABLET_HEIGHT = 1024;

const DESKTOP_HEIGHT = 900;

const TAP_CHECK_MAX = 768;

const heightOf = (width: number): number => {
  if (width <= PHONE_MAX) {
    return PHONE_HEIGHT;
  }

  if (width <= TABLET_MAX) {
    return TABLET_HEIGHT;
  }

  return DESKTOP_HEIGHT;
};

const labelOf = (width: number, scheme: CellScheme): string =>
  `Matrix ${width} ${scheme}`;

const schemesOf = (choice: SchemeChoice): readonly CellScheme[] => {
  if (choice === "both") {
    return ["light", "dark"];
  }

  return [choice];
};

const widthsOf = (widths: readonly number[]): readonly number[] => {
  if (widths.length === 0) {
    return DEFAULT_WIDTHS;
  }

  return [...new Set(widths)].toSorted((left, right) => left - right);
};

const toCells = (request: MatrixRequest): readonly MatrixCell[] => {
  const widths = widthsOf(request.widths);

  return schemesOf(request.schemes).flatMap((scheme) =>
    widths.map((width) => ({
      height: heightOf(width),
      label: labelOf(width, scheme),
      scheme,
      width,
    }))
  );
};

const checksTapTargets = (width: number): boolean => width <= TAP_CHECK_MAX;

export { checksTapTargets, labelOf, toCells };

export type { CellScheme, MatrixCell, MatrixRequest, SchemeChoice };

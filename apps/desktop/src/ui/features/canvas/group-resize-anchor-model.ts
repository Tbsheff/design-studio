import type { SelectionContext } from "@design-studio/contracts";

type AnchorKey = "bottom" | "left" | "right" | "top";

type AnchorStyle = Readonly<Partial<Record<AnchorKey, string>>>;

interface AnchorBox {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface GroupAnchor {
  readonly bottom: number;
  readonly isFromBottom: boolean;
  readonly isFromRight: boolean;
  readonly right: number;
  readonly snapBottom: number;
  readonly snapRight: number;
}

interface AnchorLayer extends GroupAnchor {
  readonly height: number;
  readonly isAbsolute: boolean;
  readonly isHeightFixed: boolean;
  readonly isWidthFixed: boolean;
  readonly left: number;
  readonly rect: AnchorBox;
  readonly snapLeft: number;
  readonly snapTop: number;
  readonly top: number;
  readonly width: number;
}

interface AnchorFactor {
  readonly originX: number;
  readonly originY: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

interface AnchorSize {
  readonly height?: string;
  readonly width?: string;
}

interface AxisPlace {
  readonly at: number;
  readonly far: number;
  readonly isFromFar: boolean;
  readonly origin: number;
  readonly scale: number;
  readonly size: number;
  readonly sized: string | undefined;
  readonly start: number;
  readonly stepFar: number;
  readonly stepStart: number;
}

interface AxisKeys {
  readonly far: AnchorKey;
  readonly start: AnchorKey;
}

const PX_UNIT = "px";

const SCALE_STEP_PX = 4;

const FAR_CLASSES = {
  bottom: /^-?bottom-(?:\d|px$)/u,
  right: /^-?right-(?:\d|px$)/u,
} as const;

const toPx = (value: string | undefined): number | null => {
  const text = value?.trim() ?? "";

  if (!text.endsWith(PX_UNIT)) {
    return null;
  }

  const amount = Number(text.slice(0, -PX_UNIT.length));

  if (!Number.isFinite(amount)) {
    return null;
  }

  return amount;
};

const toSnapped = (value: number, step: number): number => {
  const snapped = Math.round(value / step) * step;

  if (Object.is(snapped, -0)) {
    return 0;
  }

  return snapped;
};

const toFarStep = (
  classes: readonly string[] | null,
  side: keyof typeof FAR_CLASSES
): number => {
  const pattern = FAR_CLASSES[side];

  const isOnScale = (classes ?? []).some((token) =>
    pattern.test(token.split(":").at(-1) ?? "")
  );

  if (isOnScale) {
    return SCALE_STEP_PX;
  }

  return 1;
};

const isFarAnchored = (
  near: string | undefined,
  far: string | undefined
): boolean => {
  const farText = far?.trim() ?? "";

  return (near?.trim() ?? "") === "" && farText !== "" && farText !== "auto";
};

const toGroupAnchor = (
  target: SelectionContext,
  classes: readonly string[] | null
): GroupAnchor => {
  const { styles } = target;
  const right = toPx(styles.right);
  const bottom = toPx(styles.bottom);

  return {
    bottom: bottom ?? 0,
    isFromBottom:
      bottom !== null &&
      isFarAnchored(styles["authored-top"], styles["authored-bottom"]),
    isFromRight:
      right !== null &&
      isFarAnchored(styles["authored-left"], styles["authored-right"]),
    right: right ?? 0,
    snapBottom: toFarStep(classes, "bottom"),
    snapRight: toFarStep(classes, "right"),
  };
};

const toPivot = (start: number, size: number, isSized: boolean): number => {
  if (isSized) {
    return start;
  }

  return start + size / 2;
};

const toEntry = (key: AnchorKey, value: number, base: number): AnchorStyle => {
  if (value === base) {
    return {};
  }

  return { [key]: `${value}${PX_UNIT}` };
};

const toAxisStyle = (place: AxisPlace, keys: AxisKeys): AnchorStyle => {
  if (place.scale === 1) {
    return {};
  }

  const moved = place.origin + (place.at - place.origin) * place.scale;
  const shift = moved - place.at;

  if (!place.isFromFar) {
    const next = toSnapped(place.start + shift, place.stepStart);

    return toEntry(keys.start, next, place.start);
  }

  const grow = (toPx(place.sized) ?? place.size) - place.size;
  const next = toSnapped(place.far - shift - grow, place.stepFar);

  return toEntry(keys.far, next, place.far);
};

const toPlaceStyle = (
  layer: AnchorLayer,
  factor: AnchorFactor,
  size: AnchorSize
): AnchorStyle => {
  if (!layer.isAbsolute) {
    return {};
  }

  const horizontal = toAxisStyle(
    {
      at: toPivot(layer.rect.x, layer.rect.width, layer.isWidthFixed),
      far: layer.right,
      isFromFar: layer.isFromRight,
      origin: factor.originX,
      scale: factor.scaleX,
      size: layer.width,
      sized: size.width,
      start: layer.left,
      stepFar: layer.snapRight,
      stepStart: layer.snapLeft,
    },
    { far: "right", start: "left" }
  );

  const vertical = toAxisStyle(
    {
      at: toPivot(layer.rect.y, layer.rect.height, layer.isHeightFixed),
      far: layer.bottom,
      isFromFar: layer.isFromBottom,
      origin: factor.originY,
      scale: factor.scaleY,
      size: layer.height,
      sized: size.height,
      start: layer.top,
      stepFar: layer.snapBottom,
      stepStart: layer.snapTop,
    },
    { far: "bottom", start: "top" }
  );

  return { ...horizontal, ...vertical };
};

export { PX_UNIT, toGroupAnchor, toPlaceStyle, toPx, toSnapped };

export type { GroupAnchor };

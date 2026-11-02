import { FILL_STOPS_MAX, FILL_STOPS_MIN } from "./deps.js";
import type {
  BlendMode,
  BlendProperty,
  FillInfo,
  FillInputBody,
  FillSpec,
  FillStop,
  FillType,
  RadialForm,
} from "./deps.js";

interface StopDraft {
  readonly color: string;
  readonly id: number;
  readonly position: number;
}

interface FillDraft {
  readonly angle: number;
  readonly at: string;
  readonly blend: BlendMode | null;
  readonly blendProperty: BlendProperty;
  readonly color: string;
  readonly form: RadialForm;
  readonly selected: number;
  readonly stops: readonly StopDraft[];
  readonly type: FillType;
}

const BG_BLEND = "background-blend-mode";
const BG_COLOR = "background-color";
const BG_IMAGE = "background-image";
const MIX_BLEND = "mix-blend-mode";

interface PreviewStyle {
  [BG_BLEND]?: string | null;
  [BG_COLOR]?: string | null;
  [BG_IMAGE]?: string | null;
  [MIX_BLEND]?: string | null;
}

const PERCENT = 100;
const DEFAULT_ANGLE = 180;
const FALLBACK_COLOR = "#ffffff";
const FALLBACK_END = "#000000";

const CLEAR_STYLE = {
  [BG_BLEND]: null,
  [BG_COLOR]: null,
  [BG_IMAGE]: null,
  [MIX_BLEND]: null,
} satisfies PreviewStyle;

interface RadialDraft {
  readonly at: string;
  readonly form: RadialForm;
}

const clampPercent = (value: number): number =>
  Math.round(Math.min(PERCENT, Math.max(0, value)));

const spread = (stops: readonly FillStop[]): StopDraft[] => {
  const last = Math.max(1, stops.length - 1);

  return stops.map((stop, index) => ({
    color: stop.color,
    id: index + 1,
    position: clampPercent(stop.position ?? (index / last) * PERCENT),
  }));
};

const defaultStops = (color: string): StopDraft[] => [
  { color, id: 1, position: 0 },
  { color: FALLBACK_END, id: 2, position: PERCENT },
];

const solidColor = (fill: FillSpec | null, fallback: string): string => {
  if (fill?.type === "solid") {
    return fill.paint.color;
  }

  return fill?.stops[0]?.color ?? fallback;
};

const stopsOf = (fill: FillSpec | null, color: string): StopDraft[] => {
  if (!fill || fill.type === "solid") {
    return defaultStops(color);
  }

  return spread(fill.stops);
};

const angleOf = (fill: FillSpec | null): number => {
  if (fill?.type === "linear") {
    return fill.angle;
  }

  return DEFAULT_ANGLE;
};

const radialOf = (fill: FillSpec | null): RadialDraft => {
  if (fill?.type === "radial") {
    return { at: fill.at ?? "", form: fill.form };
  }

  return { at: "", form: "ellipse" };
};

const draftOf = (info: FillInfo | null, fallback: string): FillDraft => {
  const fill = info?.fill ?? null;
  const paint = solidColor(fill, fallback || FALLBACK_COLOR);
  const [blend] = info?.blend ?? [];
  const radial = radialOf(fill);

  return {
    angle: angleOf(fill),
    at: radial.at,
    blend: blend?.mode ?? null,
    blendProperty: blend?.property ?? MIX_BLEND,
    color: paint,
    form: radial.form,
    selected: 1,
    stops: stopsOf(fill, paint),
    type: fill?.type ?? "solid",
  };
};

const sortedStops = (stops: readonly StopDraft[]): StopDraft[] =>
  stops.toSorted((left, right) => left.position - right.position);

const stopsCss = (stops: readonly StopDraft[]): string =>
  sortedStops(stops)
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(", ");

const radialHead = (draft: FillDraft): string => {
  const at = draft.at.trim();

  if (at) {
    return `${draft.form} at ${at}`;
  }

  return draft.form;
};

const gradientCss = (draft: FillDraft): string => {
  if (draft.type === "linear") {
    return `linear-gradient(${draft.angle}deg, ${stopsCss(draft.stops)})`;
  }

  return `radial-gradient(${radialHead(draft)}, ${stopsCss(draft.stops)})`;
};

const barCss = (stops: readonly StopDraft[]): string =>
  `linear-gradient(90deg, ${stopsCss(stops)})`;

const paintStyle = (draft: FillDraft): PreviewStyle => {
  if (draft.type === "solid") {
    return { [BG_COLOR]: draft.color, [BG_IMAGE]: "none" };
  }

  return { [BG_IMAGE]: gradientCss(draft) };
};

const blendStyle = (draft: FillDraft): PreviewStyle => {
  if (!draft.blend) {
    return {};
  }

  if (draft.blendProperty === MIX_BLEND) {
    return { [MIX_BLEND]: draft.blend };
  }

  return { [BG_BLEND]: draft.blend };
};

const previewStyle = (draft: FillDraft): PreviewStyle => ({
  ...paintStyle(draft),
  ...blendStyle(draft),
});

const blendBody = (draft: FillDraft): Partial<FillInputBody> => {
  if (!draft.blend) {
    return {};
  }

  return { blendMode: draft.blend, blendProperty: draft.blendProperty };
};

const stopBodies = (draft: FillDraft): FillInputBody["stops"] =>
  sortedStops(draft.stops).map((stop) => ({
    color: stop.color,
    position: stop.position,
  }));

const bodyOf = (draft: FillDraft): FillInputBody => {
  const blend = blendBody(draft);

  if (draft.type === "solid") {
    return { ...blend, color: draft.color, type: "solid" };
  }

  if (draft.type === "linear") {
    return {
      ...blend,
      angle: draft.angle,
      stops: stopBodies(draft),
      type: "linear",
    };
  }

  const radial: FillInputBody = {
    ...blend,
    form: draft.form,
    stops: stopBodies(draft),
    type: "radial",
  };

  const at = draft.at.trim();

  if (at) {
    radial.at = at;
  }

  return radial;
};

const sameDraft = (left: FillDraft, right: FillDraft): boolean =>
  JSON.stringify(bodyOf(left)) === JSON.stringify(bodyOf(right));

const canAdd = (draft: FillDraft): boolean =>
  draft.stops.length < FILL_STOPS_MAX;

const canRemove = (draft: FillDraft): boolean =>
  draft.stops.length > FILL_STOPS_MIN;

const selectedStop = (draft: FillDraft): StopDraft | null =>
  draft.stops.find((stop) => stop.id === draft.selected) ?? null;

const addStop = (draft: FillDraft, position: number): FillDraft => {
  if (!canAdd(draft)) {
    return draft;
  }

  const id = Math.max(0, ...draft.stops.map((stop) => stop.id)) + 1;
  const color = selectedStop(draft)?.color ?? draft.color;
  const stop: StopDraft = { color, id, position: clampPercent(position) };

  return { ...draft, selected: id, stops: [...draft.stops, stop] };
};

const removeStop = (draft: FillDraft, id: number): FillDraft => {
  if (!canRemove(draft)) {
    return draft;
  }

  const stops = draft.stops.filter((stop) => stop.id !== id);

  return { ...draft, selected: stops[0]?.id ?? 1, stops };
};

const patchOne = (
  stop: StopDraft,
  id: number,
  patch: Partial<Omit<StopDraft, "id">>
): StopDraft => {
  if (stop.id !== id) {
    return stop;
  }

  return { ...stop, ...patch };
};

const patchStop = (
  draft: FillDraft,
  id: number,
  patch: Partial<Omit<StopDraft, "id">>
): FillDraft => ({
  ...draft,
  stops: draft.stops.map((stop) => patchOne(stop, id, patch)),
});

const moveStop = (draft: FillDraft, id: number, position: number): FillDraft =>
  patchStop(draft, id, { position: clampPercent(position) });

const colorStop = (draft: FillDraft, id: number, color: string): FillDraft =>
  patchStop(draft, id, { color });

const positionAt = (clientX: number, rect: DOMRect): number => {
  if (rect.width <= 0) {
    return 0;
  }

  return clampPercent(((clientX - rect.left) / rect.width) * PERCENT);
};

export {
  addStop,
  barCss,
  bodyOf,
  canAdd,
  canRemove,
  CLEAR_STYLE,
  colorStop,
  draftOf,
  moveStop,
  positionAt,
  previewStyle,
  removeStop,
  sameDraft,
  selectedStop,
  sortedStops,
};

export type { FillDraft, PreviewStyle, StopDraft };

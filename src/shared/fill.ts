const FILL_TYPES = ["solid", "linear", "radial"] as const;

type FillType = (typeof FILL_TYPES)[number];

const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
  "plus-lighter",
] as const;

type BlendMode = (typeof BLEND_MODES)[number];

const BLEND_PROPERTIES = ["mix-blend-mode", "background-blend-mode"] as const;

type BlendProperty = (typeof BLEND_PROPERTIES)[number];

const RADIAL_FORMS = ["circle", "ellipse"] as const;

type RadialForm = (typeof RADIAL_FORMS)[number];

const FILL_STOPS_MIN = 2;
const FILL_STOPS_MAX = 6;
const FILL_ANGLE_MAX = 360;
const FILL_COLOR = /^[a-zA-Z0-9#.,%()\s/-]{1,80}$/u;
const FILL_TOKEN = /^[a-zA-Z0-9._-]{1,80}$/u;
const FILL_AT = /^[a-z0-9%\s.-]{1,40}$/u;

interface FillPaint {
  color: string;
  token: string | null;
}

interface FillStop extends FillPaint {
  position: number | null;
}

interface FillBlend {
  mode: BlendMode;
  property: BlendProperty;
}

interface SolidFill {
  paint: FillPaint;
  type: "solid";
}

interface LinearFill {
  angle: number;
  stops: FillStop[];
  type: "linear";
}

interface RadialFill {
  at: string | null;
  form: RadialForm;
  stops: FillStop[];
  type: "radial";
}

type FillSpec = LinearFill | RadialFill | SolidFill;

interface FillInfo {
  blend: FillBlend[];
  classes: string[];
  css: string | null;
  file: string;
  fill: FillSpec | null;
  mode: "classes" | "css";
}

export {
  BLEND_MODES,
  BLEND_PROPERTIES,
  FILL_ANGLE_MAX,
  FILL_AT,
  FILL_COLOR,
  FILL_STOPS_MAX,
  FILL_STOPS_MIN,
  FILL_TOKEN,
  FILL_TYPES,
  RADIAL_FORMS,
};

export type {
  BlendMode,
  BlendProperty,
  FillBlend,
  FillInfo,
  FillPaint,
  FillSpec,
  FillStop,
  FillType,
  LinearFill,
  RadialFill,
  RadialForm,
  SolidFill,
};

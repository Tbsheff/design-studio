const copy = {
  applied: "Motion saved.",
  apply: "Apply",
  applying: "Saving",
  curve: "Easing curve",
  delay: "Delay",
  delayLabel: "Delay in milliseconds",
  duration: "Duration",
  durationLabel: "Duration in milliseconds",
  easing: "Easing",
  easingLabel: "Easing curve",
  kindLabel: "Motion type",
  ms: "ms",
  noSource: "This element has no source location.",
  presetLabel: "Entrance preset",
  preview: "Preview",
  previewLabel: "Replay the motion in the frame",
  reduced: "Studio animations are off: your system asks for reduced motion.",
  stagger: "Stagger",
  staggerLabel: "Stagger between children in milliseconds",
  stateEnd: "Animates to the {state} styles from the variant bar.",
  stateNone:
    "Pick Hover, Focus or Active in the variant bar to set the end state.",
  title: "Motion",
  unguarded: "No prefers-reduced-motion guard on this element yet.",
} as const;

const KIND_LABELS = {
  entrance: "Entrance",
  none: "None",
  transition: "Transition",
} as const;

const PRESET_LABELS = {
  "blur-in": "Blur in",
  fade: "Fade",
  "scale-in": "Scale in",
  "slide-down": "Slide down",
  "slide-up": "Slide up",
} as const;

const EASING_LABELS = {
  ease: "Ease",
  "ease-in": "Ease in",
  "ease-in-out": "Ease in out",
  "ease-out": "Ease out",
  linear: "Linear",
} as const;

const fill = (text: string, values: Record<string, string>): string =>
  text.replaceAll(
    /\{(?<key>\w+)\}/gu,
    (whole, key: string) => values[key] ?? whole
  );

export { copy, EASING_LABELS, fill, KIND_LABELS, PRESET_LABELS };

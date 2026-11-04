const copy = {
  add: "Add keyframe",
  animation: "Animation",
  close: "Close",
  copy: "Copy",
  create: "New animation",
  delete: "Delete",
  deleteSure: "Confirm delete",
  duration: "Duration (ms)",
  easing: "Easing",
  empty: "No animations yet. Select a layer and press New animation.",
  exportCss: "Export CSS",
  exportReact: "Export React",
  exportWebm: "Export webm",
  frameNote:
    "Scrub shows the saved keyframes on the first matching layer in the frame.",
  hold: "Select a keyframe to edit its value and easing.",
  keyframe: "Keyframe",
  loop: "Loop",
  pause: "Pause",
  pick: "Animation",
  play: "Play",
  remove: "Remove keyframe",
  save: "Save",
  saved: "Saved",
  scrub: "Playhead",
  timeline: "Timeline",
  trigger: "Trigger",
  unsaved: "Unsaved changes",
  value: "Value",
} as const;

const TRIGGER_LABELS = {
  click: "Click (while pressed)",
  hover: "Hover",
  "in-view": "In view",
  load: "Load",
  scroll: "Scroll progress",
} as const;

const LOOP_LABELS = {
  alternate: "Alternate",
  infinite: "Loop",
  once: "Once",
} as const;

const EASING_OPTIONS = [
  { id: "linear", label: "linear" },
  { id: "ease", label: "ease" },
  { id: "ease-in", label: "ease-in" },
  { id: "ease-out", label: "ease-out" },
  { id: "ease-in-out", label: "ease-in-out" },
] as const;

const TRIGGER_OPTIONS = [
  { id: "load", label: TRIGGER_LABELS.load },
  { id: "hover", label: TRIGGER_LABELS.hover },
  { id: "click", label: TRIGGER_LABELS.click },
  { id: "in-view", label: TRIGGER_LABELS["in-view"] },
  { id: "scroll", label: TRIGGER_LABELS.scroll },
] as const;

const LOOP_OPTIONS = [
  { id: "once", label: LOOP_LABELS.once },
  { id: "infinite", label: LOOP_LABELS.infinite },
  { id: "alternate", label: LOOP_LABELS.alternate },
] as const;

export { copy, EASING_OPTIONS, LOOP_OPTIONS, TRIGGER_OPTIONS };

import type {
  LinkAction,
  LinkEasing,
  LinkTransition,
} from "@design-studio/contracts/links";

const ACTION_LABELS: Record<LinkAction, string> = {
  "close-overlay": "Close overlay",
  drawer: "Open as drawer",
  modal: "Open as modal",
  navigate: "Navigate",
  "open-url": "Open URL",
  "scroll-to": "Scroll to",
  "set-variable": "Set variable",
  toggle: "Show or hide",
};

const EASING_LABELS: Record<LinkEasing, string> = {
  "ease-in": "Ease in",
  "ease-in-out": "Ease in and out",
  "ease-out": "Ease out",
  linear: "Linear",
  spring: "Spring",
};

const TRANSITION_LABELS: Record<LinkTransition, string> = {
  dissolve: "Dissolve",
  instant: "Instant",
  "move-in": "Move in",
  "move-out": "Move out",
  "push-down": "Push down",
  "push-up": "Push up",
  "slide-left": "Slide left",
  "slide-right": "Slide right",
  "smart-animate": "Smart animate",
};

const REVERSE: Partial<Record<LinkTransition, LinkTransition>> = {
  "move-in": "move-out",
  "move-out": "move-in",
  "push-down": "push-up",
  "push-up": "push-down",
  "slide-left": "slide-right",
  "slide-right": "slide-left",
};

const transitionLabel = (transition: LinkTransition): string =>
  TRANSITION_LABELS[transition];

const reverseTransition = (transition: LinkTransition): LinkTransition =>
  REVERSE[transition] ?? transition;

export { ACTION_LABELS, EASING_LABELS, reverseTransition, transitionLabel };

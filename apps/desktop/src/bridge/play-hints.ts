import type { PlayPostBody } from "./play.js";

const NATIVE_CONTROL =
  "a[href], button, input, select, textarea, label, summary, [role=button], [role=link], [contenteditable]";

const isNativeControl = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(NATIVE_CONTROL) !== null;

const isTyping = (element: Element | null): boolean => {
  if (!element) {
    return false;
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }

  const tag = element.tagName.toLowerCase();

  return tag === "input" || tag === "textarea" || tag === "select";
};

const installShiftReporter = (
  post: (body: PlayPostBody) => void,
  isPlaying: () => boolean
): void => {
  let isHeld = false;

  const report = (next: boolean): void => {
    if (!isPlaying() || next === isHeld) {
      return;
    }

    isHeld = next;
    post({ isHeld: next, type: "play-shift" });
  };

  globalThis.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Shift") {
        report(true);
      }
    },
    true
  );
  globalThis.addEventListener(
    "keyup",
    (event) => {
      if (event.key === "Shift") {
        report(false);
      }
    },
    true
  );
  globalThis.addEventListener("blur", () => report(false));
};

export { installShiftReporter, isNativeControl, isTyping };

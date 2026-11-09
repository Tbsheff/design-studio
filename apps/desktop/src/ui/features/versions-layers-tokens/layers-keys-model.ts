interface KeyModifiers {
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly key: string;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

const hasNoModifiers = (event: KeyModifiers): boolean =>
  !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;

const hasCommand = (event: KeyModifiers): boolean =>
  event.metaKey || event.ctrlKey;

const isCommandShiftKey = (event: KeyModifiers, letter: string): boolean =>
  event.key.toLowerCase() === letter &&
  event.shiftKey &&
  hasCommand(event) &&
  !event.altKey;

const isLockKey = (event: KeyModifiers): boolean =>
  isCommandShiftKey(event, "l");

const isHideKey = (event: KeyModifiers): boolean =>
  isCommandShiftKey(event, "h");

const isEscapeKey = (event: KeyModifiers): boolean =>
  event.key === "Escape" && hasNoModifiers(event);

const isFindKey = (event: KeyModifiers): boolean =>
  event.key.toLowerCase() === "f" &&
  hasCommand(event) &&
  !event.shiftKey &&
  !event.altKey;

const isRenameKey = (event: KeyModifiers): boolean =>
  event.key === "F2" && hasNoModifiers(event);

export { isEscapeKey, isFindKey, isHideKey, isLockKey, isRenameKey };

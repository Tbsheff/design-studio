const TYPING_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

const ARROW_OWNERS =
  '[role="radiogroup"], [role="radio"], [role="tablist"], [role="tab"], [role="menu"], [role="menubar"], [role="listbox"], [role="option"], [role="tree"], [role="treeitem"], [role="grid"], [role="slider"], [role="spinbutton"], [role="combobox"]';

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    TYPING_TAGS.has(target.tagName) ||
    target.getAttribute("role") === "combobox"
  );
};

const editsText = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable || target.tagName === "TEXTAREA") {
    return true;
  }

  return (
    target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)
  );
};

const isTextField = (target: EventTarget | null): boolean =>
  editsText(target) ||
  (target instanceof HTMLElement && target.getAttribute("role") === "combobox");

const isArrowOwned = (element: Element): boolean =>
  element.closest(ARROW_OWNERS) !== null;

const canvasHasKeys = (): boolean => {
  const active = document.activeElement;

  return (
    !active ||
    active === document.body ||
    (active instanceof HTMLElement && active.matches(".canvas .stage"))
  );
};

export { canvasHasKeys, editsText, isArrowOwned, isTextField, isTypingTarget };

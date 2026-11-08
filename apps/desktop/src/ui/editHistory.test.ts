import type { SelectionContext, Version } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import {
  historyKeyOf,
  routeHistoryCommand,
} from "./features/canvas/use-undo-shortcut";
import type { ShortcutState } from "./features/canvas/use-undo-shortcut";
import {
  isHistoryStep,
  refreshedSelection,
  stepToast,
} from "./features/inspector/use-edit-history";

const xAxis = "x";
const yAxis = "y";

const IS_FALSE = false;
const IS_TRUE = true;

const [NO_VERSION] = Array.from<Version>({ length: 1 });

const [NO_REDO] = Array.from<NonNullable<ShortcutState["redo"]>>({
  length: 1,
});

const key = (
  over: Partial<KeyboardEvent>
): Pick<
  KeyboardEvent,
  "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "key"
> => ({
  altKey: false,
  ctrlKey: false,
  key: "z",
  metaKey: false,
  shiftKey: false,
  ...over,
});

interface ShortcutRun {
  calls: string[];
  state: ShortcutState;
}

const shortcut = (withRedo: boolean, enabled = true): ShortcutRun => {
  const calls: string[] = [];
  const onUndo = (): number => calls.push("undo");
  const onRedo = (): number => calls.push("redo");

  if (withRedo) {
    return { calls, state: { enabled, onUndo, redo: { enabled, onRedo } } };
  }

  return { calls, state: { enabled, onUndo, redo: NO_REDO } };
};

const version = (title: string, kind: Version["meta"]["kind"]): Version =>
  ({ meta: { kind }, title }) as Version;

const toSelection = (
  path: string,
  selectionStyles: Record<string, string>,
  selectionText: string
): SelectionContext => ({
  ancestors: [],
  outerHTML: "",
  rect: { height: 0, width: 0, [xAxis]: 0, [yAxis]: 0 },
  selector: path,
  source: null,
  styles: selectionStyles,
  tag: path,
  text: selectionText,
});

describe("history shortcut routing", () => {
  it("reads Cmd+Z as undo and Shift+Cmd+Z as redo", () => {
    expect.hasAssertions();

    expect(historyKeyOf(key({ metaKey: true }))).toBe("undo");
    expect(historyKeyOf(key({ ctrlKey: true, key: "Z", shiftKey: true }))).toBe(
      "redo"
    );
    expect(historyKeyOf(key({ altKey: true, metaKey: true }))).toBeNull();
    expect(historyKeyOf(key({}))).toBeNull();
    expect(historyKeyOf(key({ key: "y", metaKey: true }))).toBeNull();
  }, 0);

  it("sends the desktop Edit menu undo and redo commands to the app", () => {
    expect.hasAssertions();

    const { calls, state } = shortcut(true);
    expect(routeHistoryCommand("undo", state, () => false)).toBe(IS_TRUE);
    expect(routeHistoryCommand("redo", state, () => false)).toBe(IS_TRUE);
    expect(calls).toStrictEqual(["undo", "redo"]);
  }, 0);

  it("lets redo fall through when the app has no redo, and swallows commands under a modal", () => {
    expect.hasAssertions();

    const { calls, state } = shortcut(false);
    expect(routeHistoryCommand("redo", state, () => false)).toBe(IS_FALSE);
    expect(routeHistoryCommand("undo", state, () => true)).toBe(IS_TRUE);
    expect(calls).toStrictEqual([]);
  }, 0);

  it("claims the command but does nothing while disabled", () => {
    expect.hasAssertions();

    const { calls, state } = shortcut(true, false);
    expect(routeHistoryCommand("undo", state, () => false)).toBe(IS_TRUE);
    expect(routeHistoryCommand("redo", state, () => false)).toBe(IS_TRUE);
    expect(calls).toStrictEqual([]);
  }, 0);
});

describe("edit history helpers", () => {
  it("words the status message plainly", () => {
    expect.hasAssertions();

    expect(stepToast("undo", "Edit h1: color")).toBe("Undid edit h1: color");
    expect(stepToast("redo", "Update tokens: --primary")).toBe(
      "Redid update tokens: --primary"
    );
    expect(stepToast("undo", null)).toBe("Undid the last edit");
  }, 0);

  it("knows a history step version so a later Cmd+Z does not version-undo it", () => {
    expect.hasAssertions();

    expect(isHistoryStep(version("Undo: Edit h1: color", "manual"))).toBe(
      IS_TRUE
    );
    expect(
      isHistoryStep(version("Redo: Update tokens: --primary", "manual"))
    ).toBe(IS_TRUE);
    expect(isHistoryStep(version("Edit h1: color", "manual"))).toBe(IS_FALSE);
    expect(isHistoryStep(version("Undo: Edit h1: color", "undo"))).toBe(
      IS_FALSE
    );
    expect(isHistoryStep(NO_VERSION)).toBe(IS_FALSE);
  }, 0);

  it("refreshes styles and text of the selected elements from the preview", () => {
    expect.hasAssertions();

    const base = toSelection("h1", { color: "red" }, "New");
    const other = { ...base, selector: "p" };
    const fresh = toSelection("h1", { color: "blue" }, "Old");

    const next = refreshedSelection([base, other], ["h1", "p"], [fresh, null]);
    expect(next[0]).toMatchObject({
      selector: "h1",
      styles: { color: "blue" },
      text: "Old",
    });
    expect(next[1]).toBe(other);
  }, 0);
});

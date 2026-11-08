import { describe, expect, it } from "vitest";

import {
  ancestorsOf,
  cleanName,
  defaultCollapsed,
  dropTarget,
  editableName,
  parentOf,
  parseLayerTree,
  siblingRow,
  treeKeyAction,
  visibleRows,
} from "./layers-tree.js";

const ROW_HEIGHT = 28;
const NAME_LIMIT = 60;
const LONG_NAME_LENGTH = 200;
const ID_NAV = 2;
const ID_HOME = 3;
const ID_ABOUT = 4;
const ID_MAIN = 5;
const LAST_ROW = 4;
const NEAR_EDGE = 10;
const NUDGE = 4;
const LAST_LINE = 5;

const raw = {
  nodes: [
    {
      childCount: 1,
      depth: 0,
      hidden: false,
      id: 1,
      name: ".top",
      tag: "header",
      text: "",
    },
    {
      childCount: 2,
      depth: 1,
      hidden: false,
      id: 2,
      name: "",
      tag: "nav",
      text: "",
    },
    {
      childCount: 0,
      depth: 2,
      hidden: false,
      id: ID_HOME,
      name: "",
      tag: "a",
      text: "Home",
    },
    {
      childCount: 0,
      depth: 2,
      hidden: true,
      id: ID_ABOUT,
      name: "",
      tag: "a",
      text: "About",
    },
    {
      childCount: 0,
      depth: 0,
      hidden: false,
      id: ID_MAIN,
      name: "",
      tag: "main",
      text: "",
    },
  ],
  truncated: false,
};

const toIds = (rows: readonly { id: number }[]): number[] =>
  rows.map((row) => row.id);

describe("layers tree parsing", () => {
  it("keeps only safe fields and caps depth jumps", () => {
    expect.hasAssertions();

    const tree = parseLayerTree({
      nodes: [
        {
          depth: LAST_ROW,
          id: 1,
          name: "x".repeat(LONG_NAME_LENGTH),
          tag: "div<script>",
          text: 7,
        },
        { id: "bad" },
      ],
      truncated: "yes",
    });

    expect(tree).toStrictEqual({
      nodes: [
        {
          childCount: 0,
          depth: 0,
          hidden: false,
          id: 1,
          name: "x".repeat(NAME_LIMIT),
          tag: "divscript",
          text: "",
        },
      ],
      truncated: false,
    });
  }, 0);

  it("hides the rows under a collapsed node", () => {
    expect.hasAssertions();

    const { nodes } = parseLayerTree(raw);
    const collapsedNav = visibleRows(nodes, new Set([ID_NAV]));
    const collapsedAll = visibleRows(nodes, new Set([1, ID_NAV]));

    const openRows = visibleRows(nodes, new Set());

    expect(toIds(openRows)).toStrictEqual([
      1,
      ID_NAV,
      ID_HOME,
      ID_ABOUT,
      ID_MAIN,
    ]);
    expect(toIds(collapsedNav)).toStrictEqual([1, ID_NAV, ID_MAIN]);
    expect(toIds(collapsedAll)).toStrictEqual([1, ID_MAIN]);
  }, 0);

  it("finds ancestors and the parent", () => {
    expect.hasAssertions();

    const { nodes } = parseLayerTree(raw);

    expect(ancestorsOf(nodes, ID_ABOUT)).toStrictEqual([ID_NAV, 1]);
    expect(parentOf(nodes, ID_MAIN)).toBeNull();
    expect(defaultCollapsed(nodes, 1)).toStrictEqual(new Set([ID_NAV]));
  }, 0);

  it("cleans names for data-name", () => {
    expect.hasAssertions();
    expect(editableName(".top")).toBe("");
    expect(editableName("Hero title")).toBe("Hero title");
    expect(cleanName('Hero "big" <title> & {x}')).toBe("Hero big title  x");
  }, 0);
});

type KeyInput = Parameters<typeof treeKeyAction>[2];

const toInput = (
  collapsed: ReadonlySet<number>,
  nodes: KeyInput["nodes"],
  rows: KeyInput["rows"],
  selected: number | null
): KeyInput => ({ collapsed, nodes, rows, selected });

describe("layers tree keys", () => {
  it("maps arrow keys to select and toggle actions", () => {
    expect.hasAssertions();

    const { nodes } = parseLayerTree(raw);
    const open = visibleRows(nodes, new Set());
    const collapsedNav = new Set([ID_NAV]);
    const collapsedRows = visibleRows(nodes, collapsedNav);

    const keyAt = (
      key: string,
      selected: number | null
    ): ReturnType<typeof treeKeyAction> =>
      treeKeyAction(key, false, toInput(new Set(), nodes, open, selected));

    expect(keyAt("ArrowDown", null)).toStrictEqual({ select: 1 });
    expect(keyAt("ArrowDown", ID_NAV)).toStrictEqual({ select: ID_HOME });
    expect(keyAt("ArrowLeft", ID_NAV)).toStrictEqual({
      open: false,
      toggle: ID_NAV,
    });
    expect(keyAt("ArrowLeft", ID_HOME)).toStrictEqual({ select: ID_NAV });
    expect(
      treeKeyAction(
        "ArrowRight",
        false,
        toInput(collapsedNav, nodes, collapsedRows, ID_NAV)
      )
    ).toStrictEqual({ open: true, toggle: ID_NAV });
  }, 0);

  it("maps Enter and Tab keys", () => {
    expect.hasAssertions();

    const { nodes } = parseLayerTree(raw);
    const open = visibleRows(nodes, new Set());
    const none = new Set<number>();
    const atFirst = toInput(none, nodes, open, 1);
    const atHome = toInput(none, nodes, open, ID_HOME);

    expect(treeKeyAction("Enter", false, atFirst)).toStrictEqual({
      select: ID_NAV,
    });
    expect(treeKeyAction("Enter", true, atHome)).toStrictEqual({
      select: ID_NAV,
    });
    expect(treeKeyAction("Tab", false, atHome)).toBeNull();
  }, 0);
});

describe("layers tree drag", () => {
  it("finds siblings for a dragged row", () => {
    expect.hasAssertions();

    const { nodes } = parseLayerTree(raw);
    const open = visibleRows(nodes, new Set());

    expect(siblingRow(open, 0, 1)).toBe(LAST_ROW);
    expect(siblingRow(open, LAST_ROW, -1)).toBe(0);
    expect(siblingRow(open, 2, -1)).toBeNull();
  }, 0);

  it("finds one-step drop targets for a dragged row", () => {
    expect.hasAssertions();

    const { nodes } = parseLayerTree(raw);
    const open = visibleRows(nodes, new Set());

    const dropAt = (
      row: number,
      offset: number
    ): ReturnType<typeof dropTarget> =>
      dropTarget(open, row, offset, ROW_HEIGHT);

    expect(dropAt(ID_MAIN, NEAR_EDGE)).toStrictEqual({ line: 0, move: "up" });
    expect(dropAt(ID_MAIN, LAST_ROW * ROW_HEIGHT + NEAR_EDGE)).toBeNull();
    expect(dropAt(1, 2 * ROW_HEIGHT)).toBeNull();
    expect(dropAt(1, LAST_ROW * ROW_HEIGHT + 2)).toStrictEqual({
      line: LAST_LINE * ROW_HEIGHT,
      move: "down",
    });
    expect(dropAt(ID_HOME, ID_HOME * ROW_HEIGHT + NUDGE)).toStrictEqual({
      line: LAST_ROW * ROW_HEIGHT,
      move: "down",
    });
  }, 0);

  it("rejects a drop near the first row", () => {
    expect.hasAssertions();

    const { nodes } = parseLayerTree(raw);
    const open = visibleRows(nodes, new Set());

    expect(dropTarget(open, ID_HOME, NEAR_EDGE, ROW_HEIGHT)).toBeNull();
  }, 0);
});

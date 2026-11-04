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
      id: 3,
      name: "",
      tag: "a",
      text: "Home",
    },
    {
      childCount: 0,
      depth: 2,
      hidden: true,
      id: 4,
      name: "",
      tag: "a",
      text: "About",
    },
    {
      childCount: 0,
      depth: 0,
      hidden: false,
      id: 5,
      name: "",
      tag: "main",
      text: "",
    },
  ],
  truncated: false,
};

describe("layers tree", () => {
  it("keeps only safe fields and caps depth jumps", () => {
    const tree = parseLayerTree({
      nodes: [
        { depth: 4, id: 1, name: "x".repeat(200), tag: "div<script>", text: 7 },
        { id: "bad" },
      ],
      truncated: "yes",
    });

    expect(tree.nodes).toEqual([
      {
        childCount: 0,
        depth: 0,
        hidden: false,
        id: 1,
        name: "x".repeat(60),
        tag: "divscript",
        text: "",
      },
    ]);
    expect(tree.truncated).toBe(false);
  });

  it("hides the rows under a collapsed node", () => {
    const { nodes } = parseLayerTree(raw);
    expect(visibleRows(nodes, new Set()).map((n) => n.id)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(visibleRows(nodes, new Set([2])).map((n) => n.id)).toEqual([
      1, 2, 5,
    ]);
    expect(visibleRows(nodes, new Set([1, 2])).map((n) => n.id)).toEqual([
      1, 5,
    ]);
  });

  it("finds ancestors and the parent", () => {
    const { nodes } = parseLayerTree(raw);
    expect(ancestorsOf(nodes, 4)).toEqual([2, 1]);
    expect(parentOf(nodes, 5)).toBeNull();
    expect(defaultCollapsed(nodes, 1)).toEqual(new Set([2]));
  });

  it("maps tree keys to select and toggle actions", () => {
    const { nodes } = parseLayerTree(raw);
    const open = visibleRows(nodes, new Set());
    expect(
      treeKeyAction("ArrowDown", false, nodes, open, null, new Set())
    ).toEqual({ select: 1 });
    expect(
      treeKeyAction("ArrowDown", false, nodes, open, 2, new Set())
    ).toEqual({ select: 3 });
    expect(
      treeKeyAction("ArrowLeft", false, nodes, open, 2, new Set())
    ).toEqual({ open: false, toggle: 2 });
    expect(
      treeKeyAction("ArrowLeft", false, nodes, open, 3, new Set())
    ).toEqual({ select: 2 });
    expect(
      treeKeyAction(
        "ArrowRight",
        false,
        nodes,
        visibleRows(nodes, new Set([2])),
        2,
        new Set([2])
      )
    ).toEqual({ open: true, toggle: 2 });
    expect(treeKeyAction("Enter", false, nodes, open, 1, new Set())).toEqual({
      select: 2,
    });
    expect(treeKeyAction("Enter", true, nodes, open, 3, new Set())).toEqual({
      select: 2,
    });
    expect(treeKeyAction("Tab", false, nodes, open, 3, new Set())).toBeNull();
  });

  it("finds siblings and one-step drop targets for a dragged row", () => {
    const { nodes } = parseLayerTree(raw);
    const open = visibleRows(nodes, new Set());
    expect(siblingRow(open, 0, 1)).toBe(4);
    expect(siblingRow(open, 4, -1)).toBe(0);
    expect(siblingRow(open, 2, -1)).toBeNull();
    expect(dropTarget(open, 5, 10, 28)).toEqual({ line: 0, move: "up" });
    expect(dropTarget(open, 5, 4 * 28 + 10, 28)).toBeNull();
    expect(dropTarget(open, 1, 2 * 28, 28)).toBeNull();
    expect(dropTarget(open, 1, 4 * 28 + 2, 28)).toEqual({
      line: 5 * 28,
      move: "down",
    });
    expect(dropTarget(open, 3, 3 * 28 + 4, 28)).toEqual({
      line: 4 * 28,
      move: "down",
    });
    expect(dropTarget(open, 3, 10, 28)).toBeNull();
  });

  it("cleans names for data-name", () => {
    expect(editableName(".top")).toBe("");
    expect(editableName("Hero title")).toBe("Hero title");
    expect(cleanName('Hero "big" <title> & {x}')).toBe("Hero big title  x");
  });
});

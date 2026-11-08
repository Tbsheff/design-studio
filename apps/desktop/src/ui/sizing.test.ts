import { describe, expect, it } from "vitest";

import {
  toActiveCell,
  toAlignCell,
  toAxisRole,
  toParentLayout,
  toSizeMode,
  toSizePatch,
} from "./features/inspector/index";

const rowParent = toParentLayout({
  "parent-display": "flex",
  "parent-flex-direction": "row",
});
const columnParent = toParentLayout({
  "parent-display": "inline-flex",
  "parent-flex-direction": "column",
});
const blockParent = toParentLayout({
  "parent-display": "block",
  "parent-flex-direction": "row",
});
const plain = {
  width: "240px",
  height: "80px",
  flex: "0 1 auto",
  "align-self": "auto",
};

describe(toAxisRole, () => {
  it("maps width and height to the main and cross axis of a flex parent", () => {
    expect(toAxisRole("width", rowParent)).toBe("main");
    expect(toAxisRole("height", rowParent)).toBe("cross");
    expect(toAxisRole("width", columnParent)).toBe("cross");
    expect(toAxisRole("height", columnParent)).toBe("main");
    expect(toAxisRole("width", blockParent)).toBe("none");
  });
});

const patchOf = (
  axis: "width" | "height",
  mode: "hug" | "fill" | "fixed",
  context: Parameters<typeof toSizePatch>[2]
): ReturnType<typeof toSizePatch> => toSizePatch(axis, mode, context, null);

describe(toSizePatch, () => {
  it("fill writes flex: 1 on the main axis of a flex parent", () => {
    expect(
      patchOf("width", "fill", {
        parent: rowParent,
        usedPx: "240px",
        values: plain,
      })
    ).toEqual({
      flex: "1",
    });
    expect(
      patchOf("height", "fill", {
        parent: columnParent,
        usedPx: "80px",
        values: plain,
      })
    ).toEqual({
      flex: "1",
    });
  });

  it("fill writes align-self: stretch and clears the size on the cross axis", () => {
    expect(
      patchOf("height", "fill", {
        parent: rowParent,
        usedPx: "80px",
        values: plain,
      })
    ).toEqual({
      "align-self": "stretch",
      height: "",
    });
  });

  it("fill writes 100% outside flex", () => {
    expect(
      patchOf("width", "fill", {
        parent: blockParent,
        usedPx: "240px",
        values: plain,
      })
    ).toEqual({
      width: "100%",
    });
  });
});

describe("size modes", () => {
  it("hug writes fit-content and clears a flex grow", () => {
    expect(
      patchOf("width", "hug", {
        parent: rowParent,
        usedPx: "240px",
        values: { ...plain, flex: "1 1 0%" },
      })
    ).toEqual({ width: "fit-content", flex: "" });
    expect(
      patchOf("height", "hug", {
        parent: blockParent,
        usedPx: "80px",
        values: plain,
      })
    ).toEqual({
      height: "fit-content",
    });
  });

  it("fixed writes the used px and clears stretch", () => {
    expect(
      patchOf("height", "fixed", {
        parent: rowParent,
        usedPx: "80px",
        values: { ...plain, height: "", "align-self": "stretch" },
      })
    ).toEqual({ height: "80px", "align-self": "" });
    expect(
      patchOf("width", "fixed", {
        parent: blockParent,
        usedPx: "132px",
        values: { ...plain, width: "fit-content" },
      })
    ).toEqual({ width: "132px" });
  });

  it("round-trips each mode through toSizeMode", () => {
    for (const parent of [rowParent, columnParent, blockParent]) {
      for (const axis of ["width", "height"] as const) {
        for (const mode of ["hug", "fill", "fixed"] as const) {
          const next = {
            ...plain,
            ...patchOf(axis, mode, { parent, usedPx: "100px", values: plain }),
          };
          expect(toSizeMode(axis, next, parent, null)).toBe(mode);
        }
      }
    }
  });
});

describe("align grid", () => {
  it("maps a cell to justify and align by direction", () => {
    expect(toAlignCell(1, 2, true)).toEqual({
      justify: "center",
      align: "flex-end",
    });
    expect(toAlignCell(1, 2, false)).toEqual({
      justify: "flex-end",
      align: "center",
    });
  });

  it("finds the active cell and none for stretch", () => {
    expect(toActiveCell("center", "flex-end", true)).toEqual({
      col: 1,
      row: 2,
    });
    expect(toActiveCell("flex-end", "center", false)).toEqual({
      col: 1,
      row: 2,
    });
    expect(toActiveCell("normal", "normal", true)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  toActiveCell,
  toAlignCell,
  toAxisRole,
  toParentLayout,
  toSizeMode,
  toSizePatch,
} from "./features/inspector/sizing";

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

describe(toSizePatch, () => {
  it("fill writes flex: 1 on the main axis of a flex parent", () => {
    expect(toSizePatch("width", "fill", plain, rowParent, "240px")).toEqual({
      flex: "1",
    });
    expect(toSizePatch("height", "fill", plain, columnParent, "80px")).toEqual({
      flex: "1",
    });
  });

  it("fill writes align-self: stretch and clears the size on the cross axis", () => {
    expect(toSizePatch("height", "fill", plain, rowParent, "80px")).toEqual({
      "align-self": "stretch",
      height: "",
    });
  });

  it("fill writes 100% outside flex", () => {
    expect(toSizePatch("width", "fill", plain, blockParent, "240px")).toEqual({
      width: "100%",
    });
  });

  it("hug writes fit-content and clears a flex grow", () => {
    expect(
      toSizePatch(
        "width",
        "hug",
        { ...plain, flex: "1 1 0%" },
        rowParent,
        "240px"
      )
    ).toEqual({ width: "fit-content", flex: "" });
    expect(toSizePatch("height", "hug", plain, blockParent, "80px")).toEqual({
      height: "fit-content",
    });
  });

  it("fixed writes the used px and clears stretch", () => {
    expect(
      toSizePatch(
        "height",
        "fixed",
        { ...plain, height: "", "align-self": "stretch" },
        rowParent,
        "80px"
      )
    ).toEqual({ height: "80px", "align-self": "" });
    expect(
      toSizePatch(
        "width",
        "fixed",
        { ...plain, width: "fit-content" },
        blockParent,
        "132px"
      )
    ).toEqual({ width: "132px" });
  });

  it("round-trips each mode through toSizeMode", () => {
    for (const parent of [rowParent, columnParent, blockParent]) {
      for (const axis of ["width", "height"] as const) {
        for (const mode of ["hug", "fill", "fixed"] as const) {
          const next = {
            ...plain,
            ...toSizePatch(axis, mode, plain, parent, "100px"),
          };
          expect(toSizeMode(axis, next, parent)).toBe(mode);
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

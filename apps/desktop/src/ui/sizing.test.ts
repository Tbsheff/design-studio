import { describe, expect, it } from "vitest";

import {
  activeCell,
  alignCell,
  axisRole,
  parentLayout,
  sizeModeOf,
  sizePatch,
} from "./features/inspector/sizing";

const rowParent = parentLayout({
  "parent-display": "flex",
  "parent-flex-direction": "row",
});

const columnParent = parentLayout({
  "parent-display": "inline-flex",
  "parent-flex-direction": "column",
});

const blockParent = parentLayout({
  "parent-display": "block",
  "parent-flex-direction": "row",
});

const plain = {
  "align-self": "auto",
  flex: "0 1 auto",
  height: "80px",
  width: "240px",
};

describe(axisRole, () => {
  it("maps width and height to the main and cross axis of a flex parent", () => {
    expect.hasAssertions();

    expect(axisRole("width", rowParent)).toBe("main");
    expect(axisRole("height", rowParent)).toBe("cross");
    expect(axisRole("width", columnParent)).toBe("cross");
    expect(axisRole("height", columnParent)).toBe("main");
    expect(axisRole("width", blockParent)).toBe("none");
  }, 0);
});

describe(sizePatch, () => {
  it("fill writes flex: 1 on the main axis of a flex parent", () => {
    expect.hasAssertions();

    expect(sizePatch("width", "fill", plain, rowParent, "240px")).toStrictEqual(
      {
        flex: "1",
      }
    );
    expect(
      sizePatch("height", "fill", plain, columnParent, "80px")
    ).toStrictEqual({
      flex: "1",
    });
  }, 0);

  it("fill writes align-self: stretch and clears the size on the cross axis", () => {
    expect.hasAssertions();

    expect(sizePatch("height", "fill", plain, rowParent, "80px")).toStrictEqual(
      {
        "align-self": "stretch",
        height: "",
      }
    );
  }, 0);

  it("fill writes 100% outside flex", () => {
    expect.hasAssertions();

    expect(
      sizePatch("width", "fill", plain, blockParent, "240px")
    ).toStrictEqual({
      width: "100%",
    });
  }, 0);
});

describe("sizePatch hug and fixed", () => {
  it("hug writes fit-content and clears a flex grow", () => {
    expect.hasAssertions();

    expect(
      sizePatch(
        "width",
        "hug",
        { ...plain, flex: "1 1 0%" },
        rowParent,
        "240px"
      )
    ).toStrictEqual({ flex: "", width: "fit-content" });
    expect(
      sizePatch("height", "hug", plain, blockParent, "80px")
    ).toStrictEqual({
      height: "fit-content",
    });
  }, 0);

  it("fixed writes the used px and clears stretch", () => {
    expect.hasAssertions();

    expect(
      sizePatch(
        "height",
        "fixed",
        { ...plain, "align-self": "stretch", height: "" },
        rowParent,
        "80px"
      )
    ).toStrictEqual({ "align-self": "", height: "80px" });
    expect(
      sizePatch(
        "width",
        "fixed",
        { ...plain, width: "fit-content" },
        blockParent,
        "132px"
      )
    ).toStrictEqual({ width: "132px" });
  }, 0);

  it("round-trips each mode through sizeModeOf", () => {
    expect.hasAssertions();

    for (const parent of [rowParent, columnParent, blockParent]) {
      for (const axis of ["width", "height"] as const) {
        for (const mode of ["hug", "fill", "fixed"] as const) {
          const next = {
            ...plain,
            ...sizePatch(axis, mode, plain, parent, "100px"),
          };

          expect(sizeModeOf(axis, next, parent)).toBe(mode);
        }
      }
    }
  }, 0);
});

describe("align grid", () => {
  it("maps a cell to justify and align by direction", () => {
    expect.hasAssertions();

    expect(alignCell(1, 2, true)).toStrictEqual({
      align: "flex-end",
      justify: "center",
    });
    expect(alignCell(1, 2, false)).toStrictEqual({
      align: "center",
      justify: "flex-end",
    });
  }, 0);

  it("finds the active cell and none for stretch", () => {
    expect.hasAssertions();

    expect(activeCell("center", "flex-end", true)).toStrictEqual({
      col: 1,
      row: 2,
    });
    expect(activeCell("flex-end", "center", false)).toStrictEqual({
      col: 1,
      row: 2,
    });
    expect(activeCell("normal", "normal", true)).toBeNull();
  }, 0);
});

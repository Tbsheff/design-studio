import type { CanvasLayoutGrid } from "@design-studio/contracts/layout-grid";

const toLayoutGridText = (grid: CanvasLayoutGrid | null): string => {
  if (grid === null) {
    return "";
  }

  const columns = `${grid.columns} columns, gutter ${grid.gutter}, margin ${grid.margin}`;

  if (grid.rowStep === null) {
    return `, layout grid: ${columns}; line up the page content with these columns`;
  }

  return `, layout grid: ${columns}, row step ${grid.rowStep}; line up the page content with these columns`;
};

export { toLayoutGridText };

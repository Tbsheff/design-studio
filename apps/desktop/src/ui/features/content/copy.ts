const dataFill = {
  apply: "Apply",
  applyLabel: "Fill the layer from the pasted data",
  cell: "Slot",
  error: {
    bad_json: "The JSON must be an array of objects or arrays.",
    empty: "The pasted data has no rows.",
    too_big: "The data is over 100 KB.",
    too_many_rows: "The data has more than 200 rows.",
  },
  filled: "Filled with data rows:",
  open: "Fill from data",
  paste: "Paste CSV, TSV or a JSON array",
  pasteLabel: "Data to fill the layer with",
  placeholder: "Name,Status,Amount",
  previewLabel: "Preview of the first rows",
  total: "rows",
} as const;

const copy = {
  apply: "Apply",
  applyLabel: "Apply content stress",
  applying: "Applying…",
  decrease: "Fewer rows",
  failed: "Could not apply the content. Try again.",
  groupLabel: "Sample content",
  increase: "More rows",
  minus: "-",
  mode: {
    empty: "Empty",
    long: "Long",
    pseudo: "Pseudo",
    short: "Short",
  },
  modeTip: {
    empty: "Remove the text to see empty states",
    long: "Use very long text to show overflow",
    pseudo: "Add accents and 30% more width to show clipping",
    short: "Use one to three characters",
  },
  plus: "+",
  preset: {
    commerce: "Commerce",
    finance: "Finance",
    generic: "Generic",
    healthcare: "Health",
    social: "Social",
  },
  presetTip: {
    commerce: "Products, orders and prices",
    finance: "Payees, transfers and balances",
    generic: "Names, dates, statuses and amounts",
    healthcare: "Patients, visits and results",
    social: "Handles, posts and counts",
  },
  repeatLabel: "Rows",
  reset: "Reset",
  stressLabel: "Stress",
} as const;

export { copy, dataFill };

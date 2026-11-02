const copy = {
  cancel: "Cancel",
  close: "Close",
  frameMissing:
    "The page is imported, but its frame did not show on the canvas. Open it from the Frames list.",
  import: "Import",
  importing: "Importing…",
  menuItem: "Import page from URL…",
  note: "The copy is static. Scripts, iframes, forms and trackers are removed.",
  selector: "Only this part",
  selectorHint: "header, main > section:nth-of-type(2)",
  selectorNote: "A CSS selector. Leave empty to copy the whole page.",
  title: "Import page from URL",
  url: "Page URL",
  urlHint: "https://example.com",
  urlWrong: "Use an https URL, or http://localhost for a dev server.",
  viewport: "Viewport",
} as const;

const STEP_TEXT = {
  assets: "Copying images and fonts…",
  loading: "Loading the page…",
  styles: "Reading the styles…",
} as const;

export { STEP_TEXT, copy };

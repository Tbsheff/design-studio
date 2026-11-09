const SYSTEM_TEXT =
  "The design system sets the tokens, type and components Claude uses in this direction.";

const EDIT_DESIGN_LABEL = "Edit DESIGN.md";

const COLUMN_COPY = {
  assetsIcons: "Icons",
  assetsNote:
    "Select a layer on the canvas, then add an asset to it. Components, patterns and charts are on the Components tab.",
  assetsPhotos: "Stock photos",
  column: "Panel column",
  comments: "Comments",
  inspector: "Inspector",
  layersEmpty: "Layers show for the live preview.",
  pagesEmpty: "Pages show once the canvas loads.",
  tokensEmpty: "This project has no tokens yet.",
} as const;

export { COLUMN_COPY, EDIT_DESIGN_LABEL, SYSTEM_TEXT };

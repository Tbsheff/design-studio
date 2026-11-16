const SYSTEM_TEXT =
  "The design system sets the tokens, type and components Claude uses in this direction.";

const EDIT_DESIGN_LABEL = "Edit DESIGN.md";

const TEXT_NOT_SAVED_PREFIX =
  "The layer changed while you typed, so your text is not saved. Select the layer and type it again:";

const COLUMN_COPY = {
  assetsIcons: "Icons",
  assetsNote: "Select a layer, then add an icon or photo to it.",
  assetsPhotos: "Stock photos",
  assetsTokens: "Tokens",
  backToChat: "Back to chat",
  close: "Close",
  column: "Panel column",
  comments: "Comments",
  inspector: "Inspector",
  layersEmpty: "Layers show for the live preview.",
  pagesEmpty: "Pages show once the canvas loads.",
  tokensEmpty: "This project has no tokens yet.",
} as const;

export { COLUMN_COPY, EDIT_DESIGN_LABEL, SYSTEM_TEXT, TEXT_NOT_SAVED_PREFIX };

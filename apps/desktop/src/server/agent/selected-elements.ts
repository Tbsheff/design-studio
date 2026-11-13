const SELECTION_PICTURE_NAME = "selection-picture.png";

const PICTURE_NOTE = "Picture: the selected layers as the user sees them.";

const SELECTED_ELEMENTS_END = "</selected-elements>";

const MOCK_SELECTION_REPLY = "Updated the selected element(s).";

const MOCK_PICTURE_REPLY =
  "Updated the selected element(s). The picture of the selection showed me the layers as you see them.";

interface NamedAttachment {
  readonly name?: string;
}

const hasSelectionPicture = (
  attachments: readonly NamedAttachment[]
): boolean =>
  attachments.some((attachment) => attachment.name === SELECTION_PICTURE_NAME);

const toSelectedElementsEnd = (
  attachments: readonly NamedAttachment[]
): string[] => {
  if (hasSelectionPicture(attachments)) {
    return [PICTURE_NOTE, SELECTED_ELEMENTS_END];
  }

  return [SELECTED_ELEMENTS_END];
};

const toMockSelectionReply = (
  attachments: readonly NamedAttachment[]
): string => {
  if (hasSelectionPicture(attachments)) {
    return MOCK_PICTURE_REPLY;
  }

  return MOCK_SELECTION_REPLY;
};

const toStylesText = (styles: Record<string, string>): string => {
  const entries = Object.entries(styles);

  if (entries.length === 0) {
    return "(none)";
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join("; ");
};

export {
  hasSelectionPicture,
  SELECTION_PICTURE_NAME,
  toMockSelectionReply,
  toSelectedElementsEnd,
  toStylesText,
};

const copy = {
  aspect: "Shape",
  edit: "Edit this image",
  editDone: "Image changed",
  editNeedsPrompt: "Describe the change first.",
  editPlaceholder: "Make the sky a warm sunset",
  editPrompt: "Change prompt",
  expand: "Expand",
  expandMenu: "Expand to shape",
  generate: "Generate",
  generating: "Generating…",
  hint: "Describe the image. The studio makes two versions to choose from.",
  mockBody: "Mock images",
  mockLink: "Settings",
  mockNote:
    "Gradients only. Add an image key in Settings to create real images.",
  placed: "Image placed",
  placeholder: "A calm yoga studio at sunrise",
  prompt: "Prompt",
  style: "Style",
  tab: "Generate",
  use: "Use",
  using: "Placing…",
  variants: "Options",
} as const;

const ASPECT_LABEL = {
  hero: "Hero",
  square: "Square",
  tall: "Tall",
  wide: "Wide",
} as const;

const STYLE_LABEL = {
  abstract: "Abstract",
  icon: "Icon",
  illustration: "Illustration",
  photo: "Photo",
} as const;

const EDIT_LABEL = {
  expand: "Expand",
  prompt: "Change with prompt",
  "remove-background": "Remove background",
  upscale: "Upscale",
} as const;

const EXPAND_LABEL = {
  "16:9": "16:9",
  "1:1": "1:1",
  "3:2": "3:2",
  "4:3": "4:3",
  "9:16": "9:16",
  fill: "Fill layer",
} as const;

export { ASPECT_LABEL, copy, EDIT_LABEL, EXPAND_LABEL, STYLE_LABEL };

const copy = {
  aspect: "Shape",
  edit: "Edit this image",
  editDone: "Image changed",
  editNeedsPrompt: "Describe the change first.",
  editPlaceholder: "Make the sky a warm sunset",
  editPrompt: "Change prompt",
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
  prompt: "Change with prompt",
  "remove-background": "Remove background",
  upscale: "Upscale",
} as const;

export { ASPECT_LABEL, copy, EDIT_LABEL, STYLE_LABEL };

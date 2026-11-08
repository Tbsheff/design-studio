type EditMode = "prompt" | "remove-background" | "upscale";

const REMOVE_TEXT =
  "Remove the background from this image. Keep the main subject exactly as it is on a fully transparent background.";

const UPSCALE_TEXT =
  "Upscale this image to a higher resolution. Keep the content, colors and composition exactly the same and add fine detail.";

const toEditText = (mode: EditMode, prompt: string): string => {
  if (mode === "remove-background") {
    return REMOVE_TEXT;
  }

  if (mode === "upscale") {
    return UPSCALE_TEXT;
  }

  return prompt;
};

export { toEditText };

export type { EditMode };

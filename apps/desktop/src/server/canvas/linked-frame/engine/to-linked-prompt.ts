interface LinkedPromptInput {
  readonly label: string;
  readonly pagePath: string;
  readonly prompt: string | null;
  readonly sourcePath: string;
}

const toWant = (input: LinkedPromptInput): string => {
  const ask = input.prompt?.trim() ?? "";

  if (ask === "") {
    return `Design the screen that "${input.label}" opens.`;
  }

  return ask;
};

const toLinkedPrompt = (input: LinkedPromptInput): string =>
  [
    toWant(input),
    `Write the page ${input.pagePath}. It opens when the user clicks "${input.label}" on ${input.sourcePath}.`,
    "Keep its head: it already uses the tokens, fonts and styles of the source page. Replace the body with the full screen. Do not change other pages.",
  ].join("\n\n");

export { toLinkedPrompt };

export type { LinkedPromptInput };

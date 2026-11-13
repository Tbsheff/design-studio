interface ImportPromptInput {
  readonly pagePath: string;
  readonly prompt: string | null;
  readonly sourcePath: string | null;
}

const toWant = (prompt: string | null): string => {
  const ask = prompt?.trim() ?? "";

  if (ask === "") {
    return "Rebuild this screen from the attached screenshot.";
  }

  return `Rebuild this screen from the attached screenshot. ${ask}`;
};

const toHeadLine = (sourcePath: string | null): string => {
  if (sourcePath === null) {
    return "Keep its head. Replace the body with the full screen. Do not change other pages.";
  }

  return `Keep its head: it already uses the tokens, fonts and styles of ${sourcePath}. Replace the body with the full screen. Do not change other pages.`;
};

const toImportPrompt = (input: ImportPromptInput): string =>
  [
    toWant(input.prompt),
    `Write the page ${input.pagePath}. Build it with the project tokens and kit components.`,
    toHeadLine(input.sourcePath),
  ].join("\n\n");

export { toImportPrompt };

export type { ImportPromptInput };

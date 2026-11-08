import { copy } from "./copy.js";

const toBlob = async (text: Promise<string>): Promise<Blob> =>
  new Blob([await text], { type: "text/plain" });

const isRichClipboard = (): boolean =>
  "ClipboardItem" in globalThis &&
  "clipboard" in navigator &&
  "write" in navigator.clipboard;

const writeRich = async (text: Promise<string>): Promise<void> => {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "text/plain": toBlob(text) }),
    ]);
  } catch (error) {
    const value = await text;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      throw error;
    }
  }
};

const writeWhenReady = async (text: Promise<string>): Promise<void> => {
  if (!isRichClipboard()) {
    await navigator.clipboard.writeText(await text);

    return;
  }

  await writeRich(text);
};

const toCopyText = async (
  produce: () => Promise<string | null>
): Promise<string> => {
  const value = await produce();

  if (!value) {
    throw new Error(copy.nothingToCopy);
  }

  return value;
};

export { toCopyText, writeWhenReady };

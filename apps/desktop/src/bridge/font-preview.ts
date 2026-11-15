import {
  toGoogleFont,
  toGoogleFontsHref,
} from "@design-studio/contracts/google-fonts";

import type { Post } from "./bridge-types.js";

type FontPreview = (message: { readonly family: string | null }) => void;

const PREVIEW_ATTR = "data-studio-font-preview";

const LOAD_TIMEOUT_MS = 3000;

const removePreviewLinks = (): void => {
  for (const link of document.querySelectorAll(`link[${PREVIEW_ATTR}]`)) {
    link.remove();
  }
};

const isFaceLoaded = async (family: string): Promise<boolean> => {
  try {
    const faces = await document.fonts.load(`1em "${family}"`);

    return faces.length > 0;
  } catch {
    return false;
  }
};

const resolveFaceLoad = async (
  family: string,
  resolve: (isLoaded: boolean) => void
): Promise<void> => {
  resolve(await isFaceLoaded(family));
};

const isFontLoaded = async (
  link: HTMLLinkElement,
  family: string
): Promise<boolean> => {
  const { promise, resolve } = Promise.withResolvers<boolean>();
  const timer = globalThis.setTimeout(() => resolve(false), LOAD_TIMEOUT_MS);

  link.addEventListener("error", () => resolve(false), { once: true });
  link.addEventListener(
    "load",
    () => {
      void resolveFaceLoad(family, resolve);
    },
    { once: true }
  );

  const isLoaded = await promise;

  globalThis.clearTimeout(timer);

  return isLoaded;
};

const postFontStatus = async (
  post: Post,
  link: HTMLLinkElement,
  family: string
): Promise<void> => {
  const isLoaded = await isFontLoaded(link, family);

  if (link.isConnected) {
    post({ family, isLoaded, type: "font-status" });
  }
};

const createFontPreview =
  (post: Post): FontPreview =>
  ({ family }) => {
    removePreviewLinks();

    const font = toGoogleFont(family ?? "");

    if (font === null) {
      return;
    }

    const link = document.createElement("link");

    link.rel = "stylesheet";
    link.href = toGoogleFontsHref([font]);
    link.setAttribute(PREVIEW_ATTR, "");
    document.head.append(link);
    void postFontStatus(post, link, font.family);
  };

export { createFontPreview };

export type { FontPreview };

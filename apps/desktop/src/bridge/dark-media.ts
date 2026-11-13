const DARK_MEDIA_STYLE_ID = "studio-theme-dark-media";
const DARK_MEDIA = /\(\s*prefers-color-scheme\s*:\s*dark\s*\)/gu;
const DARK_TEST = /\(\s*prefers-color-scheme\s*:\s*dark\s*\)/u;
const ALWAYS = "(min-width: 0px)";

const toRules = (sheet: CSSStyleSheet | null): CSSRule[] => {
  if (sheet === null) {
    return [];
  }

  try {
    return [...sheet.cssRules];
  } catch {
    return [];
  }
};

const toDarkRuleTexts = (rule: CSSRule): string[] => {
  if (rule instanceof CSSMediaRule) {
    if (DARK_TEST.test(rule.media.mediaText)) {
      return [rule.cssText.replaceAll(DARK_MEDIA, ALWAYS)];
    }

    return [...rule.cssRules].flatMap((child) => toDarkRuleTexts(child));
  }

  if (rule instanceof CSSImportRule) {
    return toRules(rule.styleSheet).flatMap((child) => toDarkRuleTexts(child));
  }

  if (rule instanceof CSSGroupingRule) {
    return [...rule.cssRules].flatMap((child) => toDarkRuleTexts(child));
  }

  return [];
};

const isStudioSheet = (sheet: CSSStyleSheet): boolean => {
  const owner = sheet.ownerNode;

  return owner instanceof Element && owner.id.startsWith("studio-");
};

const toDarkMediaCss = (): string => {
  const texts: string[] = [];

  for (const sheet of document.styleSheets) {
    const isOwnSheet = !sheet.disabled && !isStudioSheet(sheet);

    if (isOwnSheet) {
      for (const rule of toRules(sheet)) {
        texts.push(...toDarkRuleTexts(rule));
      }
    }
  }

  return texts.join("\n");
};

const removeDarkMedia = (): void => {
  document.querySelector(`#${DARK_MEDIA_STYLE_ID}`)?.remove();
};

const applyDarkMedia = (): void => {
  removeDarkMedia();
  const css = toDarkMediaCss();

  if (css === "") {
    return;
  }

  const style = document.createElement("style");
  style.id = DARK_MEDIA_STYLE_ID;
  style.textContent = css;
  (document.head ?? document.documentElement).append(style);
};

export { applyDarkMedia, removeDarkMedia };

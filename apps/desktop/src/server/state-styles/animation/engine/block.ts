const HEAD_END = "</head>";

const LT = "<";

const STYLE_TAG = `${LT}style data-studio-animation`;

const STYLE_CLOSE = `${LT}/style>`;

const toSafeId = (id: string): string => id.replaceAll(/[^a-z0-9-]/gu, "");

const toHtmlPattern = (id: string): RegExp =>
  new RegExp(
    `[ \\t]*${STYLE_TAG}="${toSafeId(id)}">[\\s\\S]*?${STYLE_CLOSE}\\n?`,
    "u"
  );

const toCssPattern = (id: string): RegExp =>
  new RegExp(
    `/\\* studio-animation:${toSafeId(id)} \\*/[\\s\\S]*?/\\* end studio-animation:${toSafeId(id)} \\*/\\n?`,
    "u"
  );

const toHtmlBlock = (id: string, css: string): string =>
  `${STYLE_TAG}="${toSafeId(id)}">\n${css}\n${STYLE_CLOSE}\n`;

const toCssRegion = (id: string, css: string): string =>
  `/* studio-animation:${toSafeId(id)} */\n${css}\n/* end studio-animation:${toSafeId(id)} */\n`;

const setHtmlBlock = (
  code: string,
  id: string,
  css: string | null
): string | null => {
  const pattern = toHtmlPattern(id);

  if (css === null) {
    return code.replace(pattern, "");
  }

  const block = toHtmlBlock(id, css);

  if (pattern.test(code)) {
    return code.replace(pattern, () => block);
  }

  const at = code.indexOf(HEAD_END);

  if (at === -1) {
    return null;
  }

  return `${code.slice(0, at)}${block}${code.slice(at)}`;
};

const setCssRegion = (text: string, id: string, css: string | null): string => {
  const pattern = toCssPattern(id);

  if (css === null) {
    return text.replace(pattern, "");
  }

  const region = toCssRegion(id, css);

  if (pattern.test(text)) {
    return text.replace(pattern, () => region);
  }

  const gap = "\n";

  if (text.endsWith("\n")) {
    return `${text}${gap}${region}`;
  }

  return `${text}${gap}${gap}${region}`;
};

const isHtmlFile = (file: string): boolean => /\.html?$/iu.test(file);

export { isHtmlFile, setCssRegion, setHtmlBlock };

const LINE_MAX = 200;

const RAW_HEX = /\b(?:raw|hard-?coded)\s+(?:hex|colou?rs?)\b|\bno\s+hex\b/iu;

const COMPONENT = /\buse\s+(?:the\s+)?<?(?<name>[A-Z][A-Za-z0-9]*)>?/u;

const INTENT = /\b(?:always|never|don'?t|do not|must|avoid|stop)\b/iu;

const SENTENCE_END = /[.!?]/u;

const TAGS = new Map<string, string>([["Link", "a"]]);

const toTag = (name: string): string => TAGS.get(name) ?? name.toLowerCase();

const toSentence = (text: string): string => {
  const flat = text.split(/\s/u).filter(Boolean).join(" ");
  const end = flat.search(SENTENCE_END);

  if (end < 0) {
    return flat.slice(0, LINE_MAX);
  }

  return flat.slice(0, Math.min(end, LINE_MAX));
};

const toMockRuleLine = (text: string): string | null => {
  if (RAW_HEX.test(text)) {
    return "Never use raw hex";
  }

  const name = COMPONENT.exec(text)?.groups?.["name"] ?? null;

  if (name !== null) {
    return `Use ${name}, not <${toTag(name)}>`;
  }

  if (INTENT.test(text)) {
    return toSentence(text);
  }

  return null;
};

export { toMockRuleLine };

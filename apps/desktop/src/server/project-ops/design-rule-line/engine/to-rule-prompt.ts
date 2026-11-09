const RULE_SYSTEM = [
  "You turn one design correction from a user into one design rule for a project.",
  "Reply with one line only, in simple technical English. Start with Never or Always. Use 120 characters or less.",
  "Use one of these shapes when it fits:",
  "Never use raw hex (for colors that must come from tokens).",
  "Never use raw values (for any value that must come from a token).",
  "Fonts: Inter, Geist (for allowed fonts).",
  "Use Button, not <button> (for a component that replaces a tag).",
  "button: rounded-md px-4 (for classes that a kind of element must have).",
  "Otherwise write one plain Always or Never line.",
  "When the text names nothing to always or never do, reply with NONE.",
].join("\n");

const toRulePrompt = (text: string): string =>
  `User message:\n${text}\n\nRule line:`;

export { RULE_SYSTEM, toRulePrompt };

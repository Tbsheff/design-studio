import type { RewriteRequest } from "../text-rewrite-model.js";

const OPTION_COUNT = 3;

const KEEP_MOST = 0.75;

const KEEP_HALF = 0.6;

const KEEP_FEW = 0.4;

const SHORTEN_RATIOS = [KEEP_MOST, KEEP_HALF, KEEP_FEW] as const;

const TRAILING_CHARS = new Set([" ", "\n", "\t", ".", "!", "?", ",", ";", ":"]);

const SPACES = /\s+/gu;

const CLARIFY_WORDS: ReadonlyMap<string, string> = new Map([
  ["utilize", "use"],
  ["leverage", "use"],
  ["commence", "start"],
  ["purchase", "buy"],
  ["assist", "help"],
  ["approximately", "about"],
]);

const TYPO_WORDS: ReadonlyMap<string, string> = new Map([
  ["teh", "the"],
  ["recieve", "receive"],
  ["definately", "definitely"],
  ["seperate", "separate"],
  ["adress", "address"],
  ["occured", "occurred"],
  ["wich", "which"],
  ["freshh", "fresh"],
  ["cofee", "coffee"],
  ["coffe", "coffee"],
  ["wellcome", "welcome"],
  ["resturant", "restaurant"],
]);

const TRANSLATIONS: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map([
  [
    "es",
    new Map([
      ["fresh", "recién"],
      ["roasted", "tostado"],
      ["daily", "cada día"],
      ["coffee", "café"],
      ["welcome", "bienvenido"],
      ["to", "a"],
      ["our", "nuestro"],
      ["menu", "menú"],
      ["order", "pedir"],
      ["now", "ahora"],
      ["book", "reservar"],
      ["a", "una"],
      ["table", "mesa"],
      ["about", "sobre"],
      ["us", "nosotros"],
      ["contact", "contacto"],
      ["home", "inicio"],
      ["the", "el"],
      ["and", "y"],
      ["best", "mejor"],
      ["in", "en"],
      ["town", "ciudad"],
      ["open", "abierto"],
    ]),
  ],
  [
    "fr",
    new Map([
      ["fresh", "frais"],
      ["roasted", "torréfié"],
      ["daily", "chaque jour"],
      ["coffee", "café"],
      ["welcome", "bienvenue"],
      ["to", "à"],
      ["our", "notre"],
      ["menu", "menu"],
      ["order", "commander"],
      ["now", "maintenant"],
      ["book", "réserver"],
      ["a", "une"],
      ["table", "table"],
      ["about", "à propos"],
      ["us", "nous"],
      ["contact", "contact"],
      ["home", "accueil"],
      ["the", "le"],
      ["and", "et"],
      ["best", "meilleur"],
      ["in", "dans"],
      ["town", "ville"],
      ["open", "ouvert"],
    ]),
  ],
  [
    "de",
    new Map([
      ["fresh", "frisch"],
      ["roasted", "geröstet"],
      ["daily", "täglich"],
      ["coffee", "Kaffee"],
      ["welcome", "willkommen"],
      ["to", "zu"],
      ["our", "unser"],
      ["menu", "Speisekarte"],
      ["order", "bestellen"],
      ["now", "jetzt"],
      ["book", "buchen"],
      ["a", "ein"],
      ["table", "Tisch"],
      ["about", "über"],
      ["us", "uns"],
      ["contact", "Kontakt"],
      ["home", "Start"],
      ["the", "der"],
      ["and", "und"],
      ["best", "beste"],
      ["in", "in"],
      ["town", "Stadt"],
      ["open", "geöffnet"],
    ]),
  ],
]);

const toWords = (text: string): readonly string[] =>
  text.trim().split(SPACES).filter(Boolean);

const toBase = (text: string): string => {
  const chars = [...text.trim()];

  while (chars.length > 0 && TRAILING_CHARS.has(chars.at(-1) ?? "")) {
    chars.pop();
  }

  return chars.join("");
};

const toUpperFirst = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

const toSentenceCase = (text: string): string =>
  toUpperFirst(text.toLowerCase());

const toWordMap = (text: string, words: ReadonlyMap<string, string>): string =>
  toWords(text)
    .map((word) => words.get(word.toLowerCase()) ?? word)
    .join(" ");

const toShorter = (text: string): readonly string[] => {
  const words = toWords(toBase(text));

  return SHORTEN_RATIOS.map((ratio) => {
    const keep = Math.max(
      1,
      Math.min(words.length - 1, Math.ceil(words.length * ratio))
    );

    return words.slice(0, keep).join(" ");
  });
};

const toLonger = (text: string): readonly string[] => {
  const base = toBase(text);

  return [
    `${base} for everyone`,
    `${base}, made with care`,
    `${base}. Take a look and see for yourself`,
  ];
};

const toClearer = (text: string): readonly string[] => {
  const plain = toWordMap(toBase(text), CLARIFY_WORDS).replaceAll(
    /\bin order to\b/giu,
    "to"
  );

  return [
    plain,
    `${toUpperFirst(plain)}.`,
    `Simply put, ${plain.charAt(0).toLowerCase()}${plain.slice(1)}`,
  ];
};

const toVoiced = (text: string): readonly string[] => {
  const calm = toSentenceCase(toBase(text).replaceAll("!", ""));

  return [
    calm,
    `${calm}.`,
    `Your ${calm.charAt(0).toLowerCase()}${calm.slice(1)}`,
  ];
};

const toFixed = (text: string): readonly string[] => {
  const fixed = toUpperFirst(toWordMap(toBase(text), TYPO_WORDS));

  return [fixed, `${fixed}.`, toWords(fixed).join(" ")];
};

const toTranslated = (text: string, language: string): readonly string[] => {
  const base = language.split("-")[0]?.toLowerCase() ?? "";
  const words = TRANSLATIONS.get(base) ?? null;

  if (words === null) {
    return [`[${language}] ${toBase(text)}`, `[${language}] ${text}`, text];
  }

  const direct = toUpperFirst(toWordMap(toBase(text), words));

  return [direct, `${direct}.`, `${direct}!`];
};

const toCandidates = (request: RewriteRequest): readonly string[] => {
  if (request.mode === "shorten") {
    return toShorter(request.text);
  }

  if (request.mode === "lengthen") {
    return toLonger(request.text);
  }

  if (request.mode === "clarify") {
    return toClearer(request.text);
  }

  if (request.mode === "voice") {
    return toVoiced(request.text);
  }

  if (request.mode === "fix") {
    return toFixed(request.text);
  }

  return toTranslated(request.text, request.language ?? "en");
};

const PADDERS: readonly ((text: string) => string)[] = [
  (text) => text.toUpperCase(),
  (text) => `${text}.`,
  (text) => `${text}…`,
  (text) => text.toLowerCase(),
];

const toMockOptions = (request: RewriteRequest): readonly string[] => {
  const original = request.text.trim();

  const changed = [
    ...new Set(
      toCandidates(request).flatMap((option) => {
        const trimmed = option.trim();

        if (trimmed === "" || trimmed === original) {
          return [];
        }

        return [trimmed];
      })
    ),
  ];

  const padded = [...changed];
  const seed = padded.at(0) ?? original;

  for (const pad of PADDERS) {
    const next = pad(seed);

    if (
      padded.length < OPTION_COUNT &&
      next !== original &&
      !padded.includes(next)
    ) {
      padded.push(next);
    }
  }

  return padded.slice(0, OPTION_COUNT);
};

export { OPTION_COUNT, toMockOptions };

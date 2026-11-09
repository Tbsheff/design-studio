interface SpellingChecker {
  readonly isCorrect: (word: string) => boolean;
  readonly suggest: (word: string) => readonly string[];
}

type LoadChecker = () => Promise<SpellingChecker>;

const toNspellChecker = async (): Promise<SpellingChecker> => {
  const [{ default: nspell }, { default: dictionary }] = await Promise.all([
    import("nspell"),
    import("dictionary-en"),
  ]);

  const speller = nspell(
    Buffer.from(dictionary.aff),
    Buffer.from(dictionary.dic)
  );

  return {
    isCorrect: (word) => speller.correct(word),
    suggest: (word) => speller.suggest(word),
  };
};

const createCheckerLoader = (): LoadChecker => {
  const loaded = new Map<string, Promise<SpellingChecker>>();

  return (): Promise<SpellingChecker> => {
    const found = loaded.get("en");

    if (found) {
      return found;
    }

    const started = toNspellChecker();

    loaded.set("en", started);

    return started;
  };
};

export { createCheckerLoader };

export type { LoadChecker, SpellingChecker };

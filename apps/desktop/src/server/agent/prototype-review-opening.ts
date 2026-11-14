interface LineCounts {
  readonly dark: number;
  readonly flow: number;
  readonly kit: number;
  readonly phone: number;
}

interface AppLineCounts {
  readonly dark: number | null;
  readonly kit: number;
  readonly kitHigh: number;
}

const APP_KIT_RULE =
  "Use the app kit parts (Button, Badge, Card and the rest) on the lines you changed, and never edit lines you did not touch.";

const APP_DARK_RULE =
  "The app has dark values, so text on the lines you changed must keep AA contrast in dark too.";

const FLOW_RULE =
  "Each page must keep the same header, nav, footer, :root values and style sheets.";

const PHONE_RULE =
  "At 390 px, as share Play shows it on a phone, each page must fit with no sideways scroll and keep tap targets at 44 px or more.";

const DARK_RULE =
  "Each page must keep AA text contrast in dark too, as share Play shows it when the viewer picks dark.";

const listCheckedWords = (counts: LineCounts): string[] => {
  const words: string[] = [];

  if (counts.kit > 0) {
    words.push("its parts against the app kit recipes");
  }

  if (counts.flow > 0) {
    words.push("the linked pages");
  }

  if (counts.phone > 0) {
    words.push("each page at 390 x 844");
  }

  if (counts.dark > 0) {
    words.push("each page in dark");
  }

  return words;
};

const toWordList = (words: readonly string[]): string => {
  const last = words.at(-1) ?? "";

  if (words.length < 2) {
    return last;
  }

  return `${words.slice(0, -1).join(", ")} and ${last}`;
};

const toOpeningHead = (counts: LineCounts): string => {
  if (counts.kit > 0) {
    return "You finished a prototype of an app";
  }

  if (counts.flow > 0) {
    return "You finished a prototype with linked pages";
  }

  return "You finished a prototype";
};

const toFirstOpening = (counts: LineCounts): string | null => {
  const words = listCheckedWords(counts);

  if (words.length === 0) {
    return null;
  }

  const parts = [
    `${toOpeningHead(counts)}, so the studio checked ${toWordList(words)}.`,
  ];

  if (counts.flow > 0) {
    parts.push(FLOW_RULE);
  }

  if (counts.phone > 0) {
    parts.push(PHONE_RULE);
  }

  if (counts.dark > 0) {
    parts.push(DARK_RULE);
  }

  return parts.join(" ");
};

const toCheckOpening = (counts: LineCounts, pass: number): string | null => {
  if (pass === 1) {
    return toFirstOpening(counts);
  }

  if (counts.flow === 0 && counts.phone === 0 && counts.dark === 0) {
    return null;
  }

  return `You edited again after the studio checks, so the studio checked ${toWordList(listCheckedWords(counts))} once more. These gaps are left.`;
};

const hasAppGap = (counts: AppLineCounts): boolean =>
  counts.kitHigh > 0 || (counts.dark ?? 0) > 0;

const listAppRules = (counts: AppLineCounts): string[] => {
  const rules: string[] = [];

  if (counts.kit > 0) {
    rules.push(APP_KIT_RULE);
  }

  if ((counts.dark ?? 0) > 0) {
    rules.push(APP_DARK_RULE);
  }

  return rules;
};

const toAppCheckedText = (counts: AppLineCounts): string => {
  if (counts.dark === null) {
    return "against the app kit";
  }

  return "against the app kit and in dark";
};

const toAppOpening = (
  counts: AppLineCounts,
  ran: string,
  pass: number
): string | null => {
  if (ran !== "" && pass > 1) {
    return `You edited again after the studio checks, so the studio ran ${ran} once more.`;
  }

  if (ran !== "") {
    return [
      `You finished an app run without ${ran}, so the studio ran them. It also checked the lines you changed ${toAppCheckedText(counts)}.`,
      ...listAppRules(counts),
    ].join(" ");
  }

  if (pass > 1 || !hasAppGap(counts)) {
    return null;
  }

  return [
    `You finished an app edit, so the studio checked the lines you changed ${toAppCheckedText(counts)}.`,
    ...listAppRules(counts),
  ].join(" ");
};

export { toAppOpening, toCheckOpening };

export type { AppLineCounts, LineCounts };

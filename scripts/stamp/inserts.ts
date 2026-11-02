const EXPORT_LINE = /^export \{ \w+ \} from "\.\/[\w./-]+\.js";$/u;

const STATUS_BODY = /[=] \{(?<body>[^}]*)\}(?<tail> as const satisfies)/u;

const byText = (left: string, right: string): number =>
  left.localeCompare(right);

const exportLine = (className: string, file: string): string =>
  `export { ${className} } from "./${file}.js";`;

const insertExportLine = (
  source: string,
  className: string,
  file: string
): string => {
  const line = exportLine(className, file);
  const rows = source.split("\n");

  while (rows.length > 0 && rows.at(-1) === "") {
    rows.pop();
  }

  const first = rows.findIndex((row) => EXPORT_LINE.test(row));
  const kept = rows.filter((row) => !EXPORT_LINE.test(row));
  const lines = rows.filter((row) => EXPORT_LINE.test(row));
  const sorted = [...new Set([...lines, line])].toSorted(byText);

  if (first === -1) {
    return `${[...kept, ...sorted].join("\n")}\n`;
  }

  kept.splice(first, 0, ...sorted);

  return `${kept.join("\n")}\n`;
};

const readRows = (body: string): Map<string, string> => {
  const rows = new Map<string, string>();

  for (const row of body.split("\n")) {
    const [name = "", code = ""] = row.trim().replace(/,$/u, "").split(": ");

    if (name !== "" && code !== "") {
      rows.set(name, code);
    }
  }

  return rows;
};

const insertStatusRow = (
  source: string,
  className: string,
  status: number
): string | null => {
  const match = STATUS_BODY.exec(source);

  if (match === null) {
    return null;
  }

  const rows = readRows(match.groups?.["body"] ?? "");

  rows.set(className, String(status));

  const body = [...rows.entries()]
    .toSorted(([left], [right]) => byText(left, right))
    .map(([name, code]) => `  ${name}: ${code},`);

  const tail = match.groups?.["tail"] ?? "";
  const block = `= {\n${body.join("\n")}\n}${tail}`;

  return source.replace(match[0], block);
};

const hasStatusRow = (source: string, className: string): boolean => {
  const match = STATUS_BODY.exec(source);

  return readRows(match?.groups?.["body"] ?? "").has(className);
};

export { exportLine, hasStatusRow, insertExportLine, insertStatusRow };

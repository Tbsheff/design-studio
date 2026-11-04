import type { StampResult } from "./write.js";

const printList = (title: string, files: readonly string[]): void => {
  if (files.length > 0) {
    const rows = files.map((file) => `  ${file}`);

    process.stdout.write(`${[title, ...rows].join("\n")}\n`);
  }
};

const report = (result: StampResult, extra: readonly string[]): void => {
  printList("Wrote:", result.written);
  printList("Regenerated:", result.generated);

  if (extra.length > 0) {
    process.stdout.write(`${extra.join("\n")}\n`);
  }
};

export { printList, report };

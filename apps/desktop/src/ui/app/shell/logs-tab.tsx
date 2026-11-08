import type { AppLogLine } from "@design-studio/contracts";
import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy";

interface LogsTabProps {
  readonly logs: AppLogLine[];
  readonly managed: boolean;
}

interface KeyedLine {
  readonly key: string;
  readonly line: AppLogLine;
}

const toKeyedLines = (logs: AppLogLine[]): KeyedLine[] => {
  const seen = new Map<string, number>();

  return logs.map((line) => {
    const base = `${line.at}|${line.stream}|${line.text}`;
    const count = seen.get(base) ?? 0;

    seen.set(base, count + 1);

    return { key: `${base}|${count}`, line };
  });
};

const toEmptyText = (managed: boolean): string => {
  if (managed) {
    return "No output yet.";
  }

  return "";
};

const LogsTab = ({ logs, managed }: LogsTabProps): ReactElement => {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });

  let body: ReactElement[] | string = toEmptyText(managed);

  if (logs.length > 0) {
    body = toKeyedLines(logs).map(({ key, line }) => (
      <span key={key} className={line.stream}>
        {line.text}
        {"\n"}
      </span>
    ));
  }

  return (
    <pre
      ref={ref}
      className="app-logs"
      role="log"
      aria-live="off"
      aria-label="Dev server log"
    >
      {!managed && (
        <span className="studio">
          {copy.theStudioDidNotStart}
          {"\n"}
        </span>
      )}
      {body}
    </pre>
  );
};

export { LogsTab };

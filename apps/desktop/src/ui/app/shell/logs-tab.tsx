import type { AppLogLine } from "@design-studio/contracts";
import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy";

const LogsTab = ({
  logs,
  managed,
}: {
  logs: AppLogLine[];
  managed: boolean;
}): ReactElement => {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const el = ref.current;

    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs.length]);

  return (
    <pre ref={ref} className="app-logs" aria-label="Dev server log">
      {!managed && (
        <span className="studio">
          {copy.theStudioDidNotStart}
          {"\n"}
        </span>
      )}
      {logs.length === 0
        ? managed
          ? "No output yet."
          : ""
        : logs.map((line, index) => (
            <span key={index} className={line.stream}>
              {line.text}
              {"\n"}
            </span>
          ))}
    </pre>
  );
};

export { LogsTab };

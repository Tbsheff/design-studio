import type { AppLogLine } from "@design-studio/contracts";
import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

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
          The studio did not start this dev server, so it cannot show its
          output. Look in the terminal where it runs. The studio checks are
          below.{"\n"}
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

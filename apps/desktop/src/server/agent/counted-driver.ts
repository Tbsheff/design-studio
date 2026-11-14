import type { DriverSink, RunDriver, SentMessage } from "./lifecycle.js";

const toCountedSink = (sink: DriverSink): DriverSink => {
  let count = 0;

  const sent = (message: SentMessage): void => {
    if (!message.continuation) {
      sink.sent(message);

      return;
    }

    count += 1;
    sink.sent({ ...message, continuation: count });
  };

  return { ...sink, sent };
};

const toCountedDriver =
  (driver: RunDriver): RunDriver =>
  async (input) =>
    await driver({ ...input, sink: toCountedSink(input.sink) });

export { toCountedDriver };

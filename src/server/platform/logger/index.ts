const logError = (message: string, ...details: unknown[]): void => {
  console.error(message, ...details);
};

const logInfo = (message: string): void => {
  console.log(message);
};

export { logError, logInfo };

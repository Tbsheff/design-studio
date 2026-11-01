const BAD_REQUEST = 400;

class BadRequestError extends Error {
  public readonly status = BAD_REQUEST;

  public constructor(message?: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export { BadRequestError };

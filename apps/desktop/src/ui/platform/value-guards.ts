const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number => typeof value === "number";

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

export { isBoolean, isNumber, isObject, isString };

type Writable<Value> = Value extends string
  ? Value
  : Value extends number
    ? Value
    : Value extends readonly (infer Item)[]
      ? Writable<Item>[]
      : Value extends object
        ? { -readonly [Key in keyof Value]: Writable<Value[Key]> }
        : Value;

const toWritable = <Value>(value: Value): Writable<Value> =>
  value as Writable<Value>;

export { toWritable };

export type { Writable };

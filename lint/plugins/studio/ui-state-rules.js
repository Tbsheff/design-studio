import { rule } from "./ast.js";

const BUSY_NAME = /^(?:is)?(?:busy|loading|pending|saving|submitting|working)$/iu;

const BUSY_MESSAGE =
  "A busy flag made with useState(false) is banned. Use const [isPending, startTransition] = useTransition() from react, and run the write in startTransition(async () => { await ... }).";

const isUseState = (node) =>
  node?.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "useState";

const isBooleanStart = (node) => {
  const [first = null] = node.arguments;

  return first !== null && first.type === "Literal" && first.value === Boolean(first.value);
};

const firstName = (pattern) => {
  if (pattern.type !== "ArrayPattern") {
    return null;
  }

  const [first = null] = pattern.elements;

  if (first === null || first.type !== "Identifier") {
    return null;
  }

  return first.name;
};

const noBusyFlag = rule((context) => ({
  VariableDeclarator: (node) => {
    const name = firstName(node.id);

    if (name !== null && BUSY_NAME.test(name) && isUseState(node.init) && isBooleanStart(node.init)) {
      context.report({ message: BUSY_MESSAGE, node: node.id });
    }
  },
}));

export { noBusyFlag };

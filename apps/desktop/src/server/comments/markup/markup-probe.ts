const toBoxPathsExpression = (
  boxes: readonly {
    readonly height: number;
    readonly width: number;
    readonly x: number;
    readonly y: number;
  }[]
): string =>
  `((boxes) => {
    const pathOf = (el) => {
      const parts = [];
      for (let node = el; node && node.parentElement && node !== document.body; node = node.parentElement) parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + ([...node.parentElement.children].indexOf(node) + 1) + ')');
      return ['body', ...parts].join(' > ');
    };
    return boxes.map((box) => {
      const hit = document.elementsFromPoint(box.x + box.width / 2, box.y + box.height / 2).find((el) => el !== document.body && el !== document.documentElement && document.body.contains(el));
      return hit ? pathOf(hit) : null;
    });
  })(${JSON.stringify(boxes)})`;

export { toBoxPathsExpression };

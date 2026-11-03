const measureScrollSize = (): [number, number] => [
  document.documentElement.scrollWidth,
  document.documentElement.scrollHeight,
];

export { measureScrollSize };

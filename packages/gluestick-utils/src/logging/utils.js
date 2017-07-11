function createArrowList(elements: string[], leftOffset: number): string {
  const offsetWithArrow: string = `${' '.repeat(leftOffset)}-> `;
  return `${offsetWithArrow}${elements.join(`\n${offsetWithArrow}`)}`;
}

module.exports = {
  createArrowList,
};

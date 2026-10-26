/**
 * Stores a set of expressions in a Calculable SVG document that can be
 * evaluated (or, recalculated)
 */
export class DocumentExpressionSet {
  private readonly expressionAttrs: Set<Attr> = new Set();
  private readonly constantNames: Set<string> = new Set();

  addExpresionAttr(value: Attr): void {
    this.expressionAttrs.add(value);
  }

  getExpressionAttrs(): Iterable<Attr> {
    return this.expressionAttrs;
  }

  addConstant(constantName: string): void {
    this.constantNames.add(constantName);
  }

  getConstantNames(): Iterable<string> {
    return this.constantNames;
  }

  get isEmpty(): boolean {
    return this.expressionAttrs.size < 1 && this.constantNames.size < 1;
  }

  clear(): void {
    this.expressionAttrs.clear();
    this.constantNames.clear();
  }

  toJsValue() {
    return {
      expressionAttrs: Array.from(this.expressionAttrs),
      constantNames: Array.from(this.constantNames),
    };
  }
}

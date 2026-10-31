import { calculateAttrXPath } from './xpath-helpers';

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

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      expressionAttrs: new Set(this.expressionAttrs),
      constantNames: new Set(this.constantNames),
    });
  }

  /**
   * Returns the instance represented as primitive types serializable by
   * `JSON.stringify` (Object, Array, string, number, boolean, undefined,
   * null)
   */
  toStringifiable() {
    return Object.freeze({
      expressionAttrs: Array.from(this.expressionAttrs).map(calculateAttrXPath),
      constantNames: Array.from(this.constantNames),
    });
  }
}

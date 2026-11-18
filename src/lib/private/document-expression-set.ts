import type { HashableAttributeCalculationDefinition } from '../api/internal/document-referenced-elements';

/**
 * Stores a set of expressions in a Calculable SVG document that can be
 * evaluated (or, recalculated)
 */
export class DocumentExpressionSet {
  private readonly attributeCalculations: Set<HashableAttributeCalculationDefinition> =
    new Set();
  private readonly constantNames: Set<string> = new Set();

  addAttributeCalculation(value: HashableAttributeCalculationDefinition): void {
    this.attributeCalculations.add(value);
  }

  getAttributeCalculations(): Iterable<HashableAttributeCalculationDefinition> {
    return this.attributeCalculations;
  }

  addConstant(constantName: string): void {
    this.constantNames.add(constantName);
  }

  getConstantNames(): Iterable<string> {
    return this.constantNames;
  }

  get isEmpty(): boolean {
    return this.attributeCalculations.size < 1 && this.constantNames.size < 1;
  }

  clear(): void {
    this.attributeCalculations.clear();
    this.constantNames.clear();
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      expressionAttrs: Array.from(this.attributeCalculations).map((c) =>
        c.toWebBuiltIns(),
      ),
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
      expressionAttrs: Array.from(this.attributeCalculations).map((c) =>
        c.toStringifiable(),
      ),
      constantNames: Array.from(this.constantNames),
    });
  }
}

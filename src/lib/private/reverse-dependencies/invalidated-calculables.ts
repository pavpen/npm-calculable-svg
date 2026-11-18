import type { HashableAttributeCalculationDefinition } from '../../api/internal/document-referenced-elements';
import { calculateElementXPath } from '../xpath-helpers';

export class InvalidatedCalculables {
  readonly constantNames: Set<string> = new Set();
  readonly attributeCalculations: Set<HashableAttributeCalculationDefinition> =
    new Set();
  readonly elements: Set<Element> = new Set();

  get isEmpty(): boolean {
    return (
      this.attributeCalculations.size < 1 &&
      this.constantNames.size < 1 &&
      this.elements.size < 1
    );
  }

  toObject() {
    return {
      constantNames: Array.from(this.constantNames),
      attributeCalculations: Array.from(this.attributeCalculations),
      elements: Array.from(this.elements),
    };
  }

  toDebugString(): string {
    return JSON.stringify({
      constantNames: Array.from(this.constantNames),
      expressionAttrXPaths: Array.from(this.attributeCalculations).map((c) =>
        c.toWebBuiltIns(),
      ),
      elementXPaths: Array.from(this.elements).map(calculateElementXPath),
    });
  }
}

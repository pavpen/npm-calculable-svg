import { NonIterableElementPropertyExpressionSet } from './get-element-property-expresion';
import { calculateAttrXPath } from './xpath-helpers';

export class AttributeDependencies {
  private readonly attributeToElementPropertyDependencies: Map<
    Attr,
    NonIterableElementPropertyExpressionSet
  > = new Map();
  private readonly attributeToConstNameDependencies: Map<Attr, Set<string>> =
    new Map();

  getElementPropertyExpressionsForAttribute(
    attribute: Attr,
  ): NonIterableElementPropertyExpressionSet | undefined {
    return this.attributeToElementPropertyDependencies.get(attribute);
  }

  getOrCreateElementPropertyExpressionsForAttribute(
    attribute: Attr,
  ): NonIterableElementPropertyExpressionSet {
    let result = this.getElementPropertyExpressionsForAttribute(attribute);

    if (typeof result === 'undefined') {
      result = new NonIterableElementPropertyExpressionSet();
      this.attributeToElementPropertyDependencies.set(attribute, result);
    }

    return result;
  }

  getConstNamesForAttribute(attribute: Attr): Iterable<string> {
    return this.attributeToConstNameDependencies.get(attribute) ?? [];
  }

  toDebugString(): string {
    return Array.from(this.attributeToElementPropertyDependencies.entries())
      .map(([attribute, dependencies]) => {
        return `${calculateAttrXPath(attribute)}: ${JSON.stringify(dependencies.synthesizeValues().map((e) => e.toString()))}`;
      })
      .join('\n');
  }
}

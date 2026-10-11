/**
 * Keeps track of which attribute, and constant expressions are affected by an
 * element bounding box
 *
 * TODO(pavel.penev): Keep track of which expressions are affected by a given
 * constant, or attribute expression, as well.  (Requires Jinja engine update.)
 */
export class ExpressionReverseDependencies {
  private readonly sizeElementToExpressionAttributes: Map<Element, Set<Attr>> =
    new Map();
  private readonly sizeElementToConstNames: Map<Element, Set<string>> =
    new Map();

  addAttributeExpressionElementSizeDependency(
    expressionAttribute: Attr,
    dependencyElement: Element,
  ): void {
    const expressionAttributes =
      this.sizeElementToExpressionAttributes.get(dependencyElement);

    if (typeof expressionAttributes === 'undefined') {
      this.sizeElementToExpressionAttributes.set(
        dependencyElement,
        new Set([expressionAttribute]),
      );
    } else {
      expressionAttributes.add(expressionAttribute);
    }
  }

  addConstExpressionElementSizeDependency(
    constName: string,
    dependencyElement: Element,
  ): void {
    const constNames = this.sizeElementToConstNames.get(dependencyElement);

    if (typeof constNames === 'undefined') {
      this.sizeElementToConstNames.set(dependencyElement, new Set([constName]));
    } else {
      constNames.add(constName);
    }
  }

  clear() {
    this.sizeElementToExpressionAttributes.clear();
    this.sizeElementToConstNames.clear();
  }
}

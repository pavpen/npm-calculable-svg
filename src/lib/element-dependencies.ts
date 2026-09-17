import { InternalInterpreterError } from './faults';
import { calculateElementXPath } from './xpath-helpers';

/**
 * Represents a tree similar to the DOM tree, but with elements which don't
 * have Calculable SVG attributes omitted
 */
export class ReferencedElement {
  closestAntecedent: ReferencedElement | null = null;
  readonly closestDescendents: Set<ReferencedElement> = new Set();
  readonly jinjaExpressionAttributes: Set<Attr>;
  readonly element: Element;

  constructor({
    element,
    jinjaExpressionAttributes,
  }: { element: Element; jinjaExpressionAttributes: Iterable<Attr> }) {
    this.element = element;
    this.jinjaExpressionAttributes = new Set(jinjaExpressionAttributes);
  }
}

export class ElementDependencies {
  private readonly elementToReferencedElement: Map<Element, ReferencedElement> =
    new Map();
  private readonly _rootReferencedElements: Set<ReferencedElement> = new Set();

  getReferencedElement(element: Element): ReferencedElement | undefined {
    return this.elementToReferencedElement.get(element);
  }

  addReferencedElement(referencedElement: ReferencedElement): void {
    this.elementToReferencedElement.set(
      referencedElement.element,
      referencedElement,
    );
  }

  referencedElements(): Iterable<ReferencedElement> {
    return this.elementToReferencedElement.values();
  }

  addRootReferencedElement(referencedElement: ReferencedElement): void {
    if (referencedElement.closestAntecedent !== null) {
      throw new InternalInterpreterError(
        `Attempted to add a root ReferencedElement which has a parent! \
Referenced element: ${calculateElementXPath(referencedElement.element)}, \
parent: ${calculateElementXPath(referencedElement.closestAntecedent.element)}`,
      );
    }

    this._rootReferencedElements.add(referencedElement);
  }

  removeRootReferencedElement(referencedElement: ReferencedElement): void {
    this._rootReferencedElements.delete(referencedElement);
  }

  rootReferencedElements(): Iterable<ReferencedElement> {
    return this._rootReferencedElements.values();
  }

  clear(): void {
    this.elementToReferencedElement.clear();
  }

  toDebugString(): string {
    return Array.from(this.elementToReferencedElement.values())
      .map(
        (referencedElement) =>
          `${calculateElementXPath(referencedElement.element)}: \
${JSON.stringify(Array.from(referencedElement.closestDescendents.values()).map((re) => calculateElementXPath(re.element)))}`,
      )
      .join('\n');
  }
}

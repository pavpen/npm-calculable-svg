import {
  type ElementDependencies,
  ReferencedElement,
} from './element-dependencies';
import { csvg_namespace } from './xml-names';

export class ElementDepedencyCalculator {
  readonly outputDependencies: ElementDependencies;

  constructor({
    outputDependencies,
  }: { outputDependencies: ElementDependencies }) {
    this.outputDependencies = outputDependencies;
  }

  insertElementReference(element: Element): ReferencedElement {
    const existingReferencedElement =
      this.outputDependencies.getReferencedElement(element);
    if (typeof existingReferencedElement !== 'undefined') {
      return existingReferencedElement;
    }
    const jinjaExpressionAttributes: Attr[] = [];

    for (const attribute of element.attributes) {
      if (attribute.namespaceURI === csvg_namespace.attributeExpression.jinja) {
        jinjaExpressionAttributes.push(attribute);
      }
    }

    const referencedElement = new ReferencedElement({
      element,
      jinjaExpressionAttributes,
    });

    const antecedent = this.findNearestReferencedAntecedent(element);
    let descendents: Iterable<ReferencedElement>;

    if (typeof antecedent === 'undefined') {
      descendents = this.outputDependencies.rootReferencedElements();
    } else {
      descendents = antecedent.closestDescendents.values();
    }
    for (const descendent of descendents) {
      if (
        this.findNearestReferencedAntecedent(descendent.element)?.element ===
        element
      ) {
        descendent.closestAntecedent = referencedElement;
        referencedElement.closestDescendents.add(descendent);
      }
    }

    if (typeof antecedent === 'undefined') {
      this.outputDependencies.addRootReferencedElement(referencedElement);
    } else {
      referencedElement.closestAntecedent = antecedent;
      antecedent.closestDescendents.add(referencedElement);
    }

    this.outputDependencies.addReferencedElement(referencedElement);

    return referencedElement;
  }

  private findNearestReferencedAntecedent(
    element: Element,
  ): ReferencedElement | undefined {
    for (
      let antecedentElement = element.parentElement;
      antecedentElement;
      antecedentElement = antecedentElement.parentElement
    ) {
      const antecedent =
        this.outputDependencies.getReferencedElement(antecedentElement);
      if (typeof antecedent !== 'undefined') {
        return antecedent;
      }
    }

    return undefined;
  }

  private processElement(element: Element): void {
    const jinjaExpressionAttributes = [];

    for (const attribute of element.attributes) {
      if (attribute.namespaceURI !== csvg_namespace.attributeExpression.jinja) {
        continue;
      }
      jinjaExpressionAttributes.push(attribute);
    }

    if (jinjaExpressionAttributes.length > 0) {
      const referencedElement = new ReferencedElement({
        element,
        jinjaExpressionAttributes,
      });
      this.outputDependencies.addReferencedElement(referencedElement);
    }

    for (const childElement of element.children) {
      this.processElement(childElement);
    }
  }

  processDocument(document: Document): void {
    this.outputDependencies.clear();

    // Collect a elements referenced due to being ancestors, or having
    // attribute expressions:
    for (const element of document.children) {
      this.processElement(element);
    }

    // Calculate dependencies for collected elements:
    for (const referencedElement of this.outputDependencies.referencedElements()) {
      const antecedent = this.findNearestReferencedAntecedent(
        referencedElement.element,
      );

      if (typeof antecedent !== 'undefined') {
        referencedElement.closestAntecedent = antecedent;
        antecedent.closestDescendents.add(referencedElement);
      } else {
        this.outputDependencies.addRootReferencedElement(referencedElement);
      }
    }
  }
}

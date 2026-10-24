import { calculateElementXPath } from '../../private/xpath-helpers';
import { csvg_xml } from '../../xml-api';
import { InternalInterpreterError } from '../faults';
import type { DocumentEvaluationInformation } from './document-evaluation-information';

/**
 * Debug representation of a CSVG referenced element
 *
 * ⚠️ This type is for package internal, and debug use.  It's API is not
 * stable, even across minor release versions.  Avoid use in production code.
 *
 * @internal
 */
export type ReferencedElementJsRepr = {
  element: Element;
  closestDescendents: Array<ReferencedElementJsRepr>;
};

/**
 * Represents an element tree similar to the DOM tree, but with elements not
 * used by Calculable SVG omitted
 *
 * ⚠️ This type is for package internal, and debug use.  It's API is not
 * stable, even across minor release versions.  Avoid use in production code.
 *
 * An element is not used by Calculable SVG, if all of the following apply:
 * * It doesn't have any Calculable SVG attributes.
 * * It's bounding box, or boundingClientRect is not referenced by any
 *   Calculable SVG expression.
 * * It's computed used style is not referenced by any Calculable SVG
 *   expression (such as `csvg.getUsedStyleDimensionsForId(docLocalId)`).
 *
 * @internal
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

  toJs(): ReferencedElementJsRepr {
    return {
      element: this.element,
      closestDescendents: Array.from(this.closestDescendents).map((n) =>
        n.toJs(),
      ),
    };
  }
}

/**
 * The sub-set of a Calculable SVG's DOM elements, each of which is a CSVG
 * {@link ReferencedElement}
 *
 * ⚠️ This type is for package internal, and debug use.  It's API is not
 * stable, even across minor release versions.  Avoid use in production code.
 *
 * @internal
 */
export class DocumentReferencedElements {
  private readonly documentEvaluationInformation: DocumentEvaluationInformation;
  private readonly elementToReferencedElement: Map<Element, ReferencedElement> =
    new Map();
  private readonly _rootReferencedElements: Set<ReferencedElement> = new Set();

  constructor(documentEvaluationInformation: DocumentEvaluationInformation) {
    this.documentEvaluationInformation = documentEvaluationInformation;
  }

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

  private findNearestReferencedAntecedent(
    element: Element,
  ): ReferencedElement | undefined {
    for (
      let antecedentElement = element.parentElement;
      antecedentElement;
      antecedentElement = antecedentElement.parentElement
    ) {
      const antecedent = this.getReferencedElement(antecedentElement);
      if (typeof antecedent !== 'undefined') {
        return antecedent;
      }
    }

    return undefined;
  }

  private collectElementExpressionAttributes(
    element: Element,
    outputJinjaExpressionAttributes: Attr[],
  ): void {
    const evaluationInformation = this.documentEvaluationInformation;

    for (const attribute of element.attributes) {
      if (
        evaluationInformation.getAttrNamespaceUri(attribute) ===
        csvg_xml.attributes.attribute_expression.jinja.namespaceUri
      ) {
        outputJinjaExpressionAttributes.push(attribute);
      }
    }
  }

  insertElementReference(element: Element): ReferencedElement {
    const existingReferencedElement = this.getReferencedElement(element);
    if (typeof existingReferencedElement !== 'undefined') {
      return existingReferencedElement;
    }

    const jinjaExpressionAttributes: Attr[] = [];
    this.collectElementExpressionAttributes(element, jinjaExpressionAttributes);

    const referencedElement = new ReferencedElement({
      element,
      jinjaExpressionAttributes,
    });

    const antecedent = this.findNearestReferencedAntecedent(element);
    let descendents: Iterable<ReferencedElement>;

    if (typeof antecedent === 'undefined') {
      descendents = this.rootReferencedElements();
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
      this.addRootReferencedElement(referencedElement);
    } else {
      referencedElement.closestAntecedent = antecedent;
      antecedent.closestDescendents.add(referencedElement);
    }

    this.addReferencedElement(referencedElement);

    return referencedElement;
  }

  /**
   * Adds elements which have expression attributes to the set of
   * {@link ReferencedElement}s in this document
   *
   * @param element DOM tree to process
   */
  private collectExpressionAttributeElements(element: Element): void {
    const treeWalker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
    );
    do {
      const currentElement = treeWalker.currentNode as Element;
      const jinjaExpressionAttributes: Attr[] = [];

      this.collectElementExpressionAttributes(
        currentElement,
        jinjaExpressionAttributes,
      );

      if (jinjaExpressionAttributes.length > 0) {
        const referencedElement = new ReferencedElement({
          element: currentElement,
          jinjaExpressionAttributes,
        });
        this.addReferencedElement(referencedElement);
      }
    } while (treeWalker.nextNode());
  }

  /**
   * Builds the tree of elements referenced due to having expression
   * attributes
   *
   * Other referenced elements should be added during document evaluation
   * (e.g., when an element is evaluated because its bounding box is used in
   * an expression).
   */
  rebuildFromExpressionAttributes(svgElement: SVGElement): void {
    this.clear();

    // Collect elements referenced due to having expression attributes:
    this.collectExpressionAttributeElements(svgElement);

    // Calculate dependencies for collected elements:
    for (const referencedElement of this.referencedElements()) {
      const antecedent = this.findNearestReferencedAntecedent(
        referencedElement.element,
      );

      if (typeof antecedent !== 'undefined') {
        referencedElement.closestAntecedent = antecedent;
        antecedent.closestDescendents.add(referencedElement);
      } else {
        this.addRootReferencedElement(referencedElement);
      }
    }
  }

  toJs() {
    return Array.from(this.elementToReferencedElement.values()).map(
      (referencedElement) => referencedElement.toJs(),
    );
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

import {
  ElementDependencies,
  type ReferencedElement,
} from './element-dependencies';
import { ElementDepedencyCalculator } from './element-dependency-calculator';
import { csvg_attribute_names, csvg_namespace } from './xml-names';
import { calculateElementXPath } from './xpath-helpers';

export class DocumentEvaluationInformation {
  private readonly elementDependencies: ElementDependencies =
    new ElementDependencies();
  private readonly elementDependencyCalculator: ElementDepedencyCalculator =
    new ElementDepedencyCalculator({
      outputDependencies: this.elementDependencies,
    });
  private readonly docLocalIdToElement: Map<string, Element> = new Map();
  private readonly constNameToExpressionAttr: Map<string, Attr> = new Map();

  calculateForDocument(document: Document): void {
    this.elementDependencies.clear();

    this.elementDependencyCalculator.processDocument(document);

    this.docLocalIdToElement.clear();

    for (const child of document.children) {
      this.processElement(child);
    }
  }

  /**
   * Builds the `docLocalIdToNode`
   */
  private processElement(element: Element): void {
    this.processDocLocalId(
      element.getAttributeNS(
        csvg_namespace.namespace,
        csvg_attribute_names.docLocalId,
      ),
      element,
    );
    for (const attribute of element.attributes) {
      if (attribute.namespaceURI === csvg_namespace.constExpression.jinja) {
        this.constNameToExpressionAttr.set(attribute.localName, attribute);
      }
    }

    for (const child of element.children) {
      this.processElement(child);
    }
  }

  private processDocLocalId(docLocalId: string | null, element: Element): void {
    if (docLocalId !== null) {
      const previousElement = this.docLocalIdToElement.get(docLocalId);
      if (typeof previousElement !== 'undefined') {
        console.warn(
          `Duplicate Calculable SVG document-local ID: ${JSON.stringify(docLocalId)}!  \
Previous element: ${calculateElementXPath(previousElement)}, \
new element: ${calculateElementXPath(element)}.`,
        );
      } else {
        this.docLocalIdToElement.set(docLocalId, element);
      }
    }
  }

  getElementByDocLocalId(docLocalId: string): Element | null {
    return this.docLocalIdToElement.get(docLocalId) ?? null;
  }

  getReferencedElement(element: Element): ReferencedElement | undefined {
    return this.elementDependencies.getReferencedElement(element);
  }

  getRootReferencedElements(): Iterable<ReferencedElement> {
    return this.elementDependencies.rootReferencedElements();
  }

  getElementDependencyCalculator(): ElementDepedencyCalculator {
    return this.elementDependencyCalculator;
  }

  getConstExpressionAttr(constName: string): Attr | undefined {
    return this.constNameToExpressionAttr.get(constName);
  }

  getConstNames(): Iterable<string> {
    return this.constNameToExpressionAttr.keys();
  }
}

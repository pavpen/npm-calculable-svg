import { csvg_attribute_names, csvg_namespace } from '../xml-names';
import {
  DocumentReferencedElements,
  type ReferencedElement,
} from './document-referenced-elements';
import { calculateElementXPath } from './xpath-helpers';

export class DocumentEvaluationInformation {
  readonly documentReferencedElements: DocumentReferencedElements =
    new DocumentReferencedElements();
  private readonly docLocalIdToElement: Map<string, Element> = new Map();
  private readonly constNameToExpressionAttr: Map<string, Attr> = new Map();

  calculateForDocument(document: Document): void {
    this.documentReferencedElements.clear();

    this.documentReferencedElements.rebuildFromExpressionAttributes(document);

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
    return this.documentReferencedElements.getReferencedElement(element);
  }

  getRootReferencedElements(): Iterable<ReferencedElement> {
    return this.documentReferencedElements.rootReferencedElements();
  }

  getConstExpressionAttr(constName: string): Attr | undefined {
    return this.constNameToExpressionAttr.get(constName);
  }

  getConstNames(): Iterable<string> {
    return this.constNameToExpressionAttr.keys();
  }
}

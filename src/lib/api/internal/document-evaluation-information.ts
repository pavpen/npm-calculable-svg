import { calculateElementXPath } from '../../private/xpath-helpers';
import { csvg_xml } from '../../xml-api';
import {
  InvalidConstantExpressionError,
  InvalidExpressionError,
  InvalidStringValueError,
} from '../faults';
import { type ConstDefinition, const_definition } from './const-definition';
import {
  DocumentReferencedElements,
  type ReferencedElement,
} from './document-referenced-elements';

/**
 * Helper for accessing elements, and attributes used in a CSVG
 *
 * ⚠️ This type is for package internal, and debug use.  It's API is not
 * stable, even across minor release versions.  Avoid use in production code.
 *
 * Use this class to build {@link DocumentReferencedElements}, get an element
 * corresponding to a `doc-local-id`, get an attribute's namespace URI, etc.
 *
 * @internal
 */
export class DocumentEvaluationInformation {
  private static idValidCharSetRegEx = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  static readonly attributeValidOutputQualifiedNameDescription =
    'valid XML attribute qualified name, restricted to ASCII characters, and not with a namespace URI that starts with the Calculable SVG root namespace';
  private static attributeValidCharSetRegEx =
    /^[a-zA-Z_-][a-zA-Z0-9._-]*:?[a-zA-Z0-9._-]*$/;

  private defaultXmlNamespaceUri: string | null = null;
  /** Used by {@link getAttrNamespaceUri} */
  private readonly xmlNamePrefixToNamespaceUri: Map<string, string> = new Map();

  private readonly docLocalIdToElement: Map<string, Element> = new Map();
  private readonly constNameToDefinition: Map<string, ConstDefinition> =
    new Map();

  readonly documentReferencedElements: DocumentReferencedElements =
    new DocumentReferencedElements(this);

  calculateForSvgElement(svgElement: SVGSVGElement): void {
    this.defaultXmlNamespaceUri = null;
    this.xmlNamePrefixToNamespaceUri.clear();
    this.collectXmlNsPrefixes(svgElement);

    this.documentReferencedElements.clear();
    this.documentReferencedElements.rebuildFromExpressionAttributes(svgElement);

    this.docLocalIdToElement.clear();
    this.constNameToDefinition.clear();
    this.processSvgElement(svgElement);
  }

  private collectXmlNsPrefixes(svgElement: SVGElement) {
    for (const attribute of svgElement.attributes) {
      if (attribute.name === 'xmlns') {
        this.defaultXmlNamespaceUri = attribute.value;
        continue;
      }

      const prefix = 'xmlns:';

      if (attribute.name.startsWith(prefix)) {
        const namespacePrefix = attribute.name.substring(prefix.length);

        this.xmlNamePrefixToNamespaceUri.set(namespacePrefix, attribute.value);
      }
    }
  }

  /**
   * Re-implements Attr.namespaceURI for an SVG embedded in an HTML, which is
   * parsed by an HTML (rather than XML) parser
   *
   * The HTML parser often ignores `xmlns` attributes as unrecognized HTML
   * attributes, rather than processing them as XML.  As a result, any custom
   * attribute's `namespaceURI` returns `null`.  This method corrects the
   * issue.
   */
  getAttrNamespaceUri(attribute: Attr): string | null {
    return this.getNamespaceUriForNamePrefix(
      xmlQualifiedNameGetPrefix(attribute.name),
    );
  }

  getNamespaceUriForNamePrefix(
    xmlNamePrefix: string | null,
    defaultValue: string | null = null,
  ): string | null {
    if (xmlNamePrefix === null) {
      return defaultValue;
    }

    const result = this.xmlNamePrefixToNamespaceUri.get(xmlNamePrefix);

    return typeof result === 'undefined' ? defaultValue : result;
  }

  getAttrLocalName(attribute: Attr): string {
    return xmlQualifiedNameGetLocalName(attribute.name);
  }

  elementGetAttributeNodeNS(
    element: Element,
    namespaceUri: string,
    localName: string,
  ): Attr | null {
    for (const attribute of element.attributes) {
      if (
        this.getAttrNamespaceUri(attribute) === namespaceUri &&
        this.getAttrLocalName(attribute) === localName
      ) {
        return attribute;
      }
    }

    return null;
  }

  /**
   * Re-implements Element.namespaceURI for an SVG embedded in an HTML, which
   * is parsed by an HTML (rather than XML) parser
   *
   * The HTML parser often ignores `xmlns` attributes as unrecognized HTML
   * attributes, rather than processing them as XML, and assigns
   * 'http://www.w3.org/2000/svg' as the namespace of SVG nodes.  As a result,
   * any custom element's `namespaceURI` returns the SVG namespace URI.  This
   * method corrects the issue.
   */
  getElementNamespaceUri(element: Element): string | null {
    return this.getNamespaceUriForNamePrefix(
      xmlQualifiedNameGetPrefix(element.tagName),
      this.defaultXmlNamespaceUri,
    );
  }

  getElementTagLocalName(element: Element): string {
    return xmlQualifiedNameGetLocalName(element.tagName);
  }

  /**
   * Builds the `docLocalIdToNode`
   */
  private processSvgElement(element: Element): void {
    const treeWalker = element.ownerDocument.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
    );

    do {
      const currentElement = treeWalker.currentNode as Element;

      this.processDocLocalId(currentElement);

      for (const attribute of currentElement.attributes) {
        if (
          this.getAttrNamespaceUri(attribute) ===
          csvg_xml.attributes.constant_expression.jinja.namespaceUri
        ) {
          this.addConstDefinition(
            const_definition.fromExpressionAttribute(attribute, this),
          );
        }
      }

      if (const_definition.isConstDefinitionElement(currentElement, this)) {
        this.addConstDefinition(
          const_definition.fromElement(currentElement, this),
        );
      }
    } while (treeWalker.nextNode());
  }

  private addConstDefinition(definition: ConstDefinition): void {
    const constName = definition.name;
    if (!this.isValidConstName(constName)) {
      const allowedValuesDescription = `must not start with '__', and must match ${DocumentEvaluationInformation.idValidCharSetRegEx}`;
      const cause = new InvalidStringValueError(
        `Invalid constant name: ${JSON.stringify(constName)}, defined at path \
${definition.getDefinitionXPath()}!  Value ${allowedValuesDescription}.`,
        {
          value: constName,
          allowedValuesDescription,
        },
      );
      throw new InvalidExpressionError(`${cause}`, { cause });
    }

    const previousDefinition = this.constNameToDefinition.get(constName);

    if (typeof previousDefinition !== 'undefined') {
      throw new InvalidConstantExpressionError(
        `Duplicate definition for constant named: \
${JSON.stringify(constName)}!  Path to previous definition: \
${previousDefinition.getDefinitionXPath()}, path to new definition: \
${definition.getDefinitionXPath()}`,
        { constName },
      );
    }

    this.constNameToDefinition.set(constName, definition);
  }

  private isValidConstName(name: string): boolean {
    return (
      name.length > 0 &&
      !name.startsWith('__') &&
      DocumentEvaluationInformation.idValidCharSetRegEx.test(name)
    );
  }

  isValidOutputAttributeQualifiedName(name: string): boolean {
    if (!DocumentEvaluationInformation.attributeValidCharSetRegEx.test(name)) {
      return false;
    }
    const namePrefix = xmlQualifiedNameGetPrefix(name);

    if (namePrefix === null) {
      return true;
    }
    if (namePrefix.toLowerCase() === 'xml') {
      return false;
    }

    const namespaceUri = this.xmlNamePrefixToNamespaceUri.get(namePrefix);
    if (namespaceUri?.startsWith(csvg_xml.csvgNamespaceUri)) {
      return false;
    }

    if (xmlQualifiedNameGetLocalName(name).length < 1) {
      return false;
    }

    return true;
  }

  private processDocLocalId(element: Element): void {
    let docLocalId: string | null = null;

    for (const attribute of element.attributes) {
      if (
        this.getAttrNamespaceUri(attribute) ===
          csvg_xml.attributes.doc_local_id.namespaceUri &&
        this.getAttrLocalName(attribute) ===
          csvg_xml.attributes.doc_local_id.attributeName
      ) {
        docLocalId = attribute.value;
      }
    }

    if (docLocalId === null) {
      return;
    }

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

  getElementByDocLocalId(docLocalId: string): Element | null {
    return this.docLocalIdToElement.get(docLocalId) ?? null;
  }

  getReferencedElement(element: Element): ReferencedElement | undefined {
    return this.documentReferencedElements.getReferencedElement(element);
  }

  getRootReferencedElements(): Iterable<ReferencedElement> {
    return this.documentReferencedElements.rootReferencedElements();
  }

  getConstDefinition(constName: string): ConstDefinition | undefined {
    return this.constNameToDefinition.get(constName);
  }

  getConstNames(): Iterable<string> {
    return this.constNameToDefinition.keys();
  }
}

export const xmlQualifiedNameGetPrefix = (name: string): string | null => {
  const separatorIndex = name.indexOf(':');

  return separatorIndex < 1 ? null : name.substring(0, separatorIndex);
};

export const xmlQualifiedNameGetLocalName = (name: string): string => {
  const separatorIndex = name.indexOf(':');

  return separatorIndex < 0 ? name : name.substring(separatorIndex + 1);
};

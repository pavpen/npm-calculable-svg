import {
  calculateAttrXPath,
  calculateElementXPath,
} from '../../private/xpath-helpers';
import { csvg_xml } from '../../xml-api';
import {
  InternalInterpreterError,
  InvalidAttributeValueError,
} from '../faults';
import { AttributeCalculationDefinition } from './attribute-calculation-definition';
import { calculation_expression } from './calculation-expression';
import {
  type DocumentEvaluationInformation,
  xmlQualifiedNameGetLocalName,
  xmlQualifiedNameGetPrefix,
} from './document-evaluation-information';

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
  closestDescendants: Array<ReferencedElementJsRepr>;
};

type ModulePrivateMarker = never;

/**
 * Like {@link AttributeCalculationDefinition}, but restricted to one instance
 * per DOM `Attr`, so that it can be inserted in primitive structures like
 * `Map`, and `Set`
 *
 * > [!WARNING]
 * > This type is for package internal, and debug use.  It's API is not
 * > stable, even across minor release versions.  Avoid use in production code.
 *
 * @internal
 */
export abstract class HashableAttributeCalculationDefinition extends AttributeCalculationDefinition {
  abstract instantiateInModuleOnly(
    modulePrivateMarker: ModulePrivateMarker,
    dontCall: never,
  ): void;
}

/**
 * Module-private, so we can ensure this class is instantiated only in this
 * module, and, at most, once per DOM `Attr`
 */
class HashableAttributeCalculationDefinitionImpl extends HashableAttributeCalculationDefinition {
  instantiateInModuleOnly(
    _modulePrivateMarker: ModulePrivateMarker,
    _dontCall: never,
  ): void {
    throw new Error('Method not implemented.');
  }
}

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
  readonly closestDescendants: Set<ReferencedElement> = new Set();
  readonly attrNamespaceUriToLocalNameToCalculation: Map<
    string,
    Map<string, HashableAttributeCalculationDefinition>
  > = new Map();
  readonly element: Element;

  constructor({
    element,
    attributeNamespaceUriToLocalNameToCalculation,
  }: {
    element: Element;
    attributeNamespaceUriToLocalNameToCalculation: Map<
      string,
      Map<string, HashableAttributeCalculationDefinition>
    >;
  }) {
    this.element = element;
    this.attrNamespaceUriToLocalNameToCalculation =
      attributeNamespaceUriToLocalNameToCalculation;
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns(): ReferencedElementJsRepr {
    return Object.freeze({
      element: this.element,
      closestDescendants: Array.from(this.closestDescendants).map((node) =>
        node.toWebBuiltIns(),
      ),
    });
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
  ): Map<string, Map<string, HashableAttributeCalculationDefinition>> {
    const evaluationInformation = this.documentEvaluationInformation;
    const definitionNameToAttributeCalculationArguments: Map<
      string,
      {
        jinjaExpressionAttr: Attr | undefined;
        outputNameAttr: Attr | undefined;
      }
    > = new Map();
    const outputNamespaceUriToLocalNameToCalculation: Map<
      string,
      Map<string, HashableAttributeCalculationDefinition>
    > = new Map();

    for (const attribute of element.attributes) {
      const namespaceUri = evaluationInformation.getAttrNamespaceUri(attribute);
      if (
        namespaceUri ===
        csvg_xml.attributes.attribute_expression.jinja.namespaceUri
      ) {
        const localName = evaluationInformation.getAttrLocalName(attribute);
        let slot = definitionNameToAttributeCalculationArguments.get(localName);
        if (typeof slot === 'undefined') {
          slot = { jinjaExpressionAttr: attribute, outputNameAttr: undefined };
          definitionNameToAttributeCalculationArguments.set(localName, slot);
        } else {
          if (typeof slot.jinjaExpressionAttr !== 'undefined') {
            console.error(
              `Multiple attributes with expressions for the same calculated \
attribute calculation!  Ignoring all but the first expression attribute.`,
              {
                element,
                definitionName: localName,
                previousDefinitionAttributeName: slot.jinjaExpressionAttr.name,
                previousDefinitionAttributeValue:
                  slot.jinjaExpressionAttr.value,
                ignoredDefinitionAttributeName: attribute.name,
                ignoredDefinitionAttributeValue: attribute.value,
              },
            );
          } else {
            slot.jinjaExpressionAttr = attribute;
          }
        }
      } else if (
        namespaceUri ===
        csvg_xml.attributes.attribute_expression.output_attribute_name
          .namespaceUri
      ) {
        const localName = evaluationInformation.getAttrLocalName(attribute);
        let slot = definitionNameToAttributeCalculationArguments.get(localName);
        if (typeof slot === 'undefined') {
          slot = { jinjaExpressionAttr: undefined, outputNameAttr: attribute };
          definitionNameToAttributeCalculationArguments.set(localName, slot);
        } else {
          if (typeof slot.outputNameAttr !== 'undefined') {
            console.error(
              `Multiple attributes defining the output attribute name for \
the same calculated attribute!  Ignoring all but the first output name \
attribute.`,
              {
                element,
                definitionName: localName,
                previousOutputNameAttributeName: slot.outputNameAttr.name,
                previousOutputNameAttributeValue: slot.outputNameAttr.value,
                ignoredOutputNameAttributeName: attribute.name,
                ignoredOutputNameAttributeValue: attribute.value,
              },
            );
          } else {
            slot.outputNameAttr = attribute;
          }
        }
      }
    }

    for (const [
      definitionName,
      { jinjaExpressionAttr, outputNameAttr },
    ] of definitionNameToAttributeCalculationArguments.entries()) {
      const outputAttributeName = outputNameAttr?.value ?? definitionName;
      const namespaceUri = evaluationInformation.getNamespaceUriForNamePrefix(
        xmlQualifiedNameGetPrefix(outputAttributeName),
      );
      if (namespaceUri === null) {
        const jinjaExpressionAttrMessage =
          typeof jinjaExpressionAttr === 'undefined'
            ? 'No jinjaExpressionAttr'
            : `Path to jinjaExpressionAttr: ${calculateAttrXPath(jinjaExpressionAttr)}`;
        const outputNameAttrMessage =
          typeof outputNameAttr === 'undefined'
            ? 'no outputNameAttr'
            : `path to outputNameAttr: ${calculateAttrXPath(outputNameAttr)}`;
        throw new InternalInterpreterError(
          `Failed to calculate default namespaceURI for Calculable SVG \
attribute!  ${jinjaExpressionAttrMessage}, ${outputNameAttrMessage}`,
        );
      }
      let outputSlot =
        outputNamespaceUriToLocalNameToCalculation.get(namespaceUri);
      if (typeof outputSlot === 'undefined') {
        outputSlot = new Map();
        outputNamespaceUriToLocalNameToCalculation.set(
          namespaceUri,
          outputSlot,
        );
      }
      if (typeof jinjaExpressionAttr === 'undefined') {
        console.assert(
          typeof outputNameAttr !== 'undefined',
          `A slot for AttributeCalculationExpression construction arguments \
was created with no recorded expression arguments!`,
          { element, jinjaExpressionAttr, outputNameAttr },
        );
        console.warn(
          `Element has an attribute expression output attribute name, but \
no corresponding expression!`,
          { element, definitionName, outputNameAttr },
        );
      } else {
        outputSlot.set(
          xmlQualifiedNameGetLocalName(outputAttributeName),
          new HashableAttributeCalculationDefinitionImpl(
            calculation_expression.forJinjaAttr(jinjaExpressionAttr),
            evaluationInformation,
            outputNameAttr,
          ),
        );
      }
    }

    return outputNamespaceUriToLocalNameToCalculation;
  }

  insertElementReference(element: Element): ReferencedElement {
    const existingReferencedElement = this.getReferencedElement(element);
    if (typeof existingReferencedElement !== 'undefined') {
      return existingReferencedElement;
    }

    const referencedElement = new ReferencedElement({
      element,
      attributeNamespaceUriToLocalNameToCalculation:
        this.collectElementExpressionAttributes(element),
    });

    const antecedent = this.findNearestReferencedAntecedent(element);
    let descendants: Iterable<ReferencedElement>;

    if (typeof antecedent === 'undefined') {
      descendants = this.rootReferencedElements();
    } else {
      descendants = antecedent.closestDescendants.values();
    }
    for (const descendent of descendants) {
      if (
        this.findNearestReferencedAntecedent(descendent.element)?.element ===
        element
      ) {
        descendent.closestAntecedent = referencedElement;
        referencedElement.closestDescendants.add(descendent);
      }
    }

    if (typeof antecedent === 'undefined') {
      this.addRootReferencedElement(referencedElement);
    } else {
      referencedElement.closestAntecedent = antecedent;
      antecedent.closestDescendants.add(referencedElement);
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
    const treeWalker = element.ownerDocument.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
    );
    do {
      const currentElement = treeWalker.currentNode as Element;
      const attributeNamespaceUriToLocalNameToCalculation =
        this.collectElementExpressionAttributes(currentElement);

      if (attributeNamespaceUriToLocalNameToCalculation.size > 0) {
        const referencedElement = new ReferencedElement({
          element: currentElement,
          attributeNamespaceUriToLocalNameToCalculation,
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
        antecedent.closestDescendants.add(referencedElement);
      } else {
        this.addRootReferencedElement(referencedElement);
      }
    }
  }

  getAttributeCalculationDefinitionForExpressionAttr(
    expressionSourceAttr: Attr,
  ): HashableAttributeCalculationDefinition | undefined {
    const ownerElement = expressionSourceAttr.ownerElement;

    if (!ownerElement) {
      return undefined;
    }
    const referencedElement = this.getReferencedElement(ownerElement);

    if (!referencedElement) {
      return undefined;
    }

    const namespaceUri =
      this.documentEvaluationInformation.getAttrNamespaceUri(
        expressionSourceAttr,
      );
    if (namespaceUri === null) {
      throw new InvalidAttributeValueError({
        attributeName: expressionSourceAttr.name,
        namespaceUri: undefined,
        value: expressionSourceAttr.value,
        allowedValuesDescription:
          'the namespace URI of the attribute must be defined for attributes \
defining attribute calculation expressions',
      });
    }

    return referencedElement.attrNamespaceUriToLocalNameToCalculation
      .get(namespaceUri)
      ?.get(
        this.documentEvaluationInformation.getAttrLocalName(
          expressionSourceAttr,
        ),
      );
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze(
      Array.from(this.elementToReferencedElement.values()).map(
        (referencedElement) => referencedElement.toWebBuiltIns(),
      ),
    );
  }

  toDebugString(): string {
    return Array.from(this.elementToReferencedElement.values())
      .map(
        (referencedElement) =>
          `${calculateElementXPath(referencedElement.element)}: \
${JSON.stringify(Array.from(referencedElement.closestDescendants.values()).map((re) => calculateElementXPath(re.element)))}`,
      )
      .join('\n');
  }
}

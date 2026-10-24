import {
  calculateAttrXPath,
  calculateElementXPath,
} from '../../private/xpath-helpers';
import { csvg_xml } from '../../xml-api';
import {
  InternalInterpreterError,
  InvalidConstantExpressionError,
} from '../faults';
import type { DocumentEvaluationInformation } from './document-evaluation-information';

/**
 * Stores information about where as what a CSVG constant was defined
 *
 * ⚠️ This type is for package internal, and debug use.  It's API is not
 * stable, even across minor release versions.  Avoid use in production code.
 *
 * @internal;
 */
export interface ConstDefinition {
  /**
   * The `<csvg:const/>` `Element` where the constant was defined, or
   * undefined, if the constant wasn't defined in an Element (but, e.g. in
   * an attribute)
   */
  readonly definitionElement: Element | undefined;

  /**
   * The XML `Attr` where the constant value expression was defined,
   * or undefined, if the constant expression wasn't defined in an attribute
   * (but, e.g. in an `Element`)
   */
  readonly expressionAttribute: Attr | undefined;

  /**
   * The XML `Attr` where the constant name was defined, or undefined,
   * if the constant name wasn't defined in an attribute
   */
  readonly constNameAttribute: Attr | undefined;

  readonly name: string;

  readonly expressionString: string;

  getDefinitionXPath(): string;
}

export namespace const_definition {
  export const isConstDefinitionElement = (
    element: Element,
    evaluationInformation: DocumentEvaluationInformation,
  ): boolean => {
    return (
      evaluationInformation.getElementNamespaceUri(element) ===
        csvg_xml.elements.csvg_const.namespaceUri &&
      evaluationInformation.getElementTagLocalName(element) ===
        csvg_xml.elements.csvg_const.elementName
    );
  };

  export const fromElement = (
    element: Element,
    evaluationInformation: DocumentEvaluationInformation,
  ): ConstDefinition => {
    return ElementConstDefinition.fromElement(element, evaluationInformation);
  };

  export const fromExpressionAttribute = (
    attribute: Attr,
    evaluationInformation: DocumentEvaluationInformation,
  ): ConstDefinition => {
    return AttributeConstDefinition.fromExpressionAttribute(
      attribute,
      evaluationInformation,
    );
  };
}

class ElementConstDefinition implements ConstDefinition {
  readonly definitionElement: Element;
  readonly name: string;

  static getNameFromDefinitionElement(
    element: Element,
    evaluationInformation: DocumentEvaluationInformation,
  ): string | null {
    for (const attribute of element.attributes) {
      if (
        evaluationInformation.getAttrNamespaceUri(attribute) ===
          csvg_xml.elements.csvg_const.attributes.const_name.namespaceUri &&
        evaluationInformation.getAttrLocalName(attribute) ===
          csvg_xml.elements.csvg_const.attributes.const_name.attributeName
      ) {
        return attribute.value;
      }
    }

    return null;
  }

  static fromElement(
    element: Element,
    evaluationInformation: DocumentEvaluationInformation,
  ): ElementConstDefinition {
    const constName = ElementConstDefinition.getNameFromDefinitionElement(
      element,
      evaluationInformation,
    );

    if (constName === null) {
      throw new InvalidConstantExpressionError(
        `Constant definition element doesn't have a \
\`${csvg_xml.elements.csvg_const.attributes.const_name.attributeName}\` attribute in namespace \
${JSON.stringify(csvg_xml.elements.csvg_const.attributes.const_name.namespaceUri)}`,
        { constName: undefined },
      );
    }

    return new ElementConstDefinition(constName, element);
  }

  constructor(name: string, definitionElement: Element) {
    this.name = name;
    this.definitionElement = definitionElement;
  }

  get expressionAttribute(): Attr | undefined {
    return undefined;
  }

  get constNameAttribute(): Attr | undefined {
    return undefined;
  }

  get expressionString(): string {
    return this.definitionElement.textContent;
  }

  getDefinitionXPath(): string {
    return calculateElementXPath(this.definitionElement);
  }
}

/**
 * @internal
 */
export class AttributeConstDefinition implements ConstDefinition {
  readonly expressionAttribute: Attr;
  readonly constNameAttribute: Attr | undefined;
  readonly name: string;

  static fromExpressionAttribute(
    expressionAttribute: Attr,
    evaluationInformation: DocumentEvaluationInformation,
  ): AttributeConstDefinition {
    const ownerElement = expressionAttribute.ownerElement;

    if (!ownerElement) {
      throw new InternalInterpreterError(
        `Attempted to create a constant definition from an attribute node, detached from an element!`,
      );
    }

    let constName = evaluationInformation.getAttrLocalName(expressionAttribute);
    let constNameAttribute: Attr | undefined;
    for (const attribute of ownerElement.attributes) {
      if (
        evaluationInformation.getAttrNamespaceUri(attribute) ===
          csvg_xml.attributes.constant_expression.const_name.namespaceUri &&
        evaluationInformation.getAttrLocalName(attribute) === constName
      ) {
        constNameAttribute = attribute;
        constName = attribute.value;
        break;
      }
    }

    return new AttributeConstDefinition(
      constName,
      expressionAttribute,
      constNameAttribute,
    );
  }

  constructor(
    name: string,
    expressionAttribute: Attr,
    constNameAttribute: Attr | undefined,
  ) {
    this.name = name;
    this.expressionAttribute = expressionAttribute;
    this.constNameAttribute = constNameAttribute;
  }

  get definitionElement(): Element | undefined {
    return undefined;
  }

  get expressionString(): string {
    return this.expressionAttribute.value;
  }

  getDefinitionXPath(): string {
    return calculateAttrXPath(this.expressionAttribute);
  }
}

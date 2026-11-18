import type { JinjaEvaluationState } from '../../private/jinja-evaluation-state';
import {
  calculateAttrXPath,
  calculateElementXPath,
} from '../../private/xpath-helpers';
import { csvg_xml } from '../../xml-api';
import {
  InternalInterpreterError,
  InvalidConstantExpressionError,
} from '../faults';
import {
  type AttrCalculationExpression,
  type CalculationExpression,
  calculation_expression,
  type ElementCalculationExpression,
} from './calculation-expression';
import type { DocumentEvaluationInformation } from './document-evaluation-information';

/**
 * Stores information about where, and as what expression a CSVG constant was
 * defined
 *
 * > [!WARNING]
 * > This type is for package internal, and debug use.  It's API is not
 * > stable, even across minor release versions.  Avoid use in production code.
 *
 * @internal;
 */
export interface ConstDefinition {
  /**
   * The XML `Attr` where the constant name was defined, or undefined,
   * if the constant name wasn't defined in an attribute
   */
  readonly constNameAttribute: Attr | undefined;

  readonly name: string;

  readonly expression: CalculationExpression;

  evaluate(jinjaEvaluationState: JinjaEvaluationState): unknown;

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

  export const fromJinjaElement = (
    element: Element,
    evaluationInformation: DocumentEvaluationInformation,
  ): ConstDefinition => {
    return JinjaElementConstDefinition.fromElement(
      element,
      evaluationInformation,
    );
  };

  export const fromJinjaAttr = (
    attribute: Attr,
    evaluationInformation: DocumentEvaluationInformation,
  ): ConstDefinition => {
    return JinjaAttrConstDefinition.fromExpressionAttribute(
      attribute,
      evaluationInformation,
    );
  };
}

class JinjaElementConstDefinition implements ConstDefinition {
  readonly expression: ElementCalculationExpression;
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
  ): JinjaElementConstDefinition {
    const constName = JinjaElementConstDefinition.getNameFromDefinitionElement(
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

    return new JinjaElementConstDefinition(constName, element);
  }

  constructor(name: string, definitionElement: Element) {
    this.name = name;
    this.expression = calculation_expression.forJinjaElement(definitionElement);
  }

  get expressionAttribute(): Attr | undefined {
    return undefined;
  }

  get constNameAttribute(): Attr | undefined {
    return undefined;
  }

  evaluate(jinjaEvaluationState: JinjaEvaluationState): unknown {
    return this.expression.evaluateStringExpression(jinjaEvaluationState);
  }

  getDefinitionXPath(): string {
    return calculateElementXPath(this.expression.sourceElement);
  }
}

/**
 * @internal
 */
export class JinjaAttrConstDefinition implements ConstDefinition {
  readonly expression: AttrCalculationExpression;
  readonly constNameAttribute: Attr | undefined;
  readonly name: string;

  static fromExpressionAttribute(
    expressionAttribute: Attr,
    evaluationInformation: DocumentEvaluationInformation,
  ): JinjaAttrConstDefinition {
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

    return new JinjaAttrConstDefinition(
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
    this.expression = calculation_expression.forJinjaAttr(expressionAttribute);
    this.constNameAttribute = constNameAttribute;
  }

  get definitionElement(): Element | undefined {
    return undefined;
  }

  evaluate(jinjaEvaluationState: JinjaEvaluationState): unknown {
    return this.expression.evaluateStringExpression(jinjaEvaluationState);
  }

  getDefinitionXPath(): string {
    return calculateAttrXPath(this.expression.sourceAttr);
  }
}

import {
  AttributeNotFoundError,
  InternalInterpreterError,
  InvalidGetElementPropertyExpressionError,
} from './faults';
import { NonIterableElementStringSet } from './helpers/element-string-set';
import { csvg_namespace } from './xml-names';
import { calculateElementXPath } from './xpath-helpers';

export namespace elementPropertyExpressionIds {
  export const getAttribute = 'getAttribute()';
  export namespace getBBox {
    export const x = 'getBBox().x';
    export const y = 'getBBox().y';
    export const width = 'getBBox().width';
    export const height = 'getBBox().height';
  }
  export const getBoundingClientRect = 'getBoundingClientRect()';
}

export type ElementPropertyExpressionId =
  | typeof elementPropertyExpressionIds.getAttribute
  | typeof elementPropertyExpressionIds.getBBox.x
  | typeof elementPropertyExpressionIds.getBBox.y
  | typeof elementPropertyExpressionIds.getBBox.width
  | typeof elementPropertyExpressionIds.getBBox.height
  | typeof elementPropertyExpressionIds.getBoundingClientRect;

/**
 * Represents a built-in expression that extracts a value from an SVG element
 *
 * E.g., `getBBox(rectangleElement)` is an expression that extracts the
 * bounding box of an element.
 */
export class GetElementPropertyExpression {
  readonly element: Element;
  readonly expression: string;

  private constructor({
    element,
    expression,
  }: {
    element: Element;
    expression: string;
  }) {
    this.element = element;
    this.expression = expression;
  }

  static fromComponents(args: {
    element: Element;
    expression: string;
  }): GetElementPropertyExpression {
    return new GetElementPropertyExpression(args);
  }

  static forGetBBoxProperty({
    element,
    propertyName,
  }: {
    element: Element;
    propertyName: 'x' | 'y' | 'width' | 'height';
  }): GetElementPropertyExpression {
    return new GetElementPropertyExpression({
      element,
      expression:
        GetElementPropertyExpression.getBBoxPropertyNameToExpressionId(
          propertyName,
        ),
    });
  }

  private static getBBoxPropertyNameToExpressionId(
    propertyName: 'x' | 'y' | 'width' | 'height',
  ): ElementPropertyExpressionId {
    switch (propertyName) {
      case 'x':
        return elementPropertyExpressionIds.getBBox.x;
      case 'y':
        return elementPropertyExpressionIds.getBBox.y;
      case 'width':
        return elementPropertyExpressionIds.getBBox.width;
      case 'height':
        return elementPropertyExpressionIds.getBBox.height;
      default:
        throw new InternalInterpreterError(
          `Unrecognized \`getBBox()\` result property: ${propertyName}`,
        );
    }
  }

  static forGetBoundingClientRect({
    element,
  }: {
    element: Element;
  }): GetElementPropertyExpression {
    return new GetElementPropertyExpression({
      element,
      expression: elementPropertyExpressionIds.getBoundingClientRect,
    });
  }

  static forGetAttribute({
    element,
    qualifiedName,
  }: {
    element: Element;
    qualifiedName: string;
  }): GetElementPropertyExpression {
    return new GetElementPropertyExpression({
      element,
      expression: `${elementPropertyExpressionIds.getAttribute}:${qualifiedName}`,
    });
  }

  getExpressionId(): ElementPropertyExpressionId {
    const expression = this.expression;
    switch (expression) {
      case elementPropertyExpressionIds.getBBox.x:
      case elementPropertyExpressionIds.getBBox.y:
      case elementPropertyExpressionIds.getBBox.width:
      case elementPropertyExpressionIds.getBBox.height:
      case elementPropertyExpressionIds.getBoundingClientRect:
        return expression;
    }
    if (expression.startsWith(elementPropertyExpressionIds.getAttribute)) {
      return elementPropertyExpressionIds.getAttribute;
    }

    throw new Error(
      `Unrecognized ElementPropertyExpression expression prefix: \
${expression}`,
    );
  }

  getAttributeName(): string | undefined {
    const prefix = `${elementPropertyExpressionIds.getAttribute}:`;

    return this.expression.startsWith(prefix)
      ? this.expression.substring(prefix.length)
      : undefined;
  }

  getExpressionAttributeOrThrow(): Attr {
    const attributeName = this.getAttributeName();
    if (typeof attributeName === 'undefined') {
      throw new InternalInterpreterError(
        `Requested a required Attr result for a property expression \
without an attribute name!  Expression: ${this.toString()}.`,
      );
    }

    const attribute = this.element.attributes.getNamedItemNS(
      csvg_namespace.attributeExpression.jinja,
      attributeName,
    );
    if (attribute === null) {
      throw new InvalidGetElementPropertyExpressionError({
        expression: this,
        cause: new AttributeNotFoundError({
          element: this.element,
          attributeQualifiedName: attributeName,
        }),
      });
    }

    return attribute;
  }

  toString(): string {
    return `ElementPropertyExpression({\
elementXPath: ${JSON.stringify(calculateElementXPath(this.element))}, \
expression: ${JSON.stringify(this.expression)}\
})`;
  }
}

export class NonIterableElementPropertyExpressionSet extends NonIterableElementStringSet {
  add(
    value: GetElementPropertyExpression,
  ): NonIterableElementPropertyExpressionSet {
    super.addFromComponents(value.element, value.expression);
    return this;
  }

  delete(value: GetElementPropertyExpression): boolean {
    return super.deleteElementWithComponents(value.element, value.expression);
  }

  has(value: GetElementPropertyExpression): boolean {
    return super.hasElementWithComponents(value.element, value.expression);
  }

  synthesizeValues(): GetElementPropertyExpression[] {
    return super
      .elementComponentValues()
      .map(([element, expression]) =>
        GetElementPropertyExpression.fromComponents({ element, expression }),
      );
  }
}

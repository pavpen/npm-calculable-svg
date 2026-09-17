import type { GetElementPropertyExpression } from './get-element-property-expresion';
import { calculateAttrXPath, calculateElementXPath } from './xpath-helpers';

export class CalculableSvgError extends Error {
  add_note(note: string): this {
    this.message = `${this.message}\n${note}`;
    return this;
  }
}

export class AttributeNotFoundError extends CalculableSvgError {
  readonly attributeQualifiedName: string;

  constructor({
    element,
    attributeQualifiedName,
  }: { element: Element; attributeQualifiedName: string }) {
    super(
      `Requested attribute not found: \
${calculateElementXPath(element)}/@${attributeQualifiedName}`,
    );

    this.attributeQualifiedName = attributeQualifiedName;
  }
}

export class InvalidExpressionError extends CalculableSvgError {}

export class InvalidGetElementPropertyExpressionError extends InvalidExpressionError {
  readonly expression: GetElementPropertyExpression;
  readonly cause: Error | undefined;

  constructor({
    expression,
    cause,
  }: {
    expression: GetElementPropertyExpression;
    cause?: Error | undefined;
  }) {
    const causeMessage = cause ? `  Caused by ${cause}` : '';
    super(
      `Invalid get element property expression: ${expression}!${causeMessage}`,
    );

    this.expression = expression;
    this.cause = cause;
  }
}

export class InvalidAttributeExpressionError extends InvalidExpressionError {
  readonly expressionString: string;
  readonly expressionDefinitionAttribute: Attr;
  readonly cause: Error | undefined;

  constructor({
    expressionString,
    expressionDefinitionAttribute,
    cause,
  }: {
    expressionString: string;
    expressionDefinitionAttribute: Attr;
    cause?: Error | undefined;
  }) {
    const causeMessage = cause ? `  Caused by ${cause}` : '';
    super(
      `Invalid attribute expression: ${expressionString}, \
defined in attribute ${calculateAttrXPath(expressionDefinitionAttribute)}!\
${causeMessage}`,
    );

    this.expressionString = expressionString;
    this.expressionDefinitionAttribute = expressionDefinitionAttribute;
    this.cause = cause;
  }
}

export class CircularAttributeSettingExpressionError extends InvalidAttributeExpressionError {
  readonly dependencyChain: Attr[];

  constructor({
    expressionString,
    expressionDefinitionAttribute,
    dependencyChain,
    cause,
  }: {
    expressionString: string;
    expressionDefinitionAttribute: Attr;
    dependencyChain: Attr[];
    cause?: Error | undefined;
  }) {
    super({ expressionString, expressionDefinitionAttribute, cause });
    this.dependencyChain = dependencyChain;
  }

  toString(): string {
    const causeMessage = this.cause ? `\nCaused by: ${this.cause}` : '';

    return `Expression circular dependency chain: ${this.dependencyChain.map(calculateAttrXPath).join(' -> ')}\
${causeMessage}`;
  }
}

export class UndefinedConstantError extends InvalidExpressionError {
  readonly constName: unknown;
  readonly cause: Error | undefined;

  constructor({
    constName,
    cause,
  }: {
    constName: unknown;
    cause?: Error | undefined;
  }) {
    const causeMessage = cause ? `  Caused by ${cause}` : '';
    super(
      `Accessed an undefined constant with name: ${JSON.stringify(constName)}!\
${causeMessage}`,
    );

    this.constName = constName;
    this.cause = cause;
  }
}

export class InvalidConstantExpressionError extends InvalidExpressionError {
  readonly constName: unknown;
  readonly cause: Error | undefined;

  constructor(
    message: string,
    {
      constName,
      cause,
    }: {
      constName: unknown;
      cause?: Error | undefined;
    },
  ) {
    super(message);

    this.constName = constName;
    this.cause = cause;
  }
}

export class CircularConstantDefinitionError extends InvalidConstantExpressionError {
  readonly dependencyChain: string[];

  constructor({
    constName,
    dependencyChain,
    cause,
  }: {
    constName: unknown;
    dependencyChain: string[];
    cause?: Error | undefined;
  }) {
    const causeMessage = cause ? `  Caused by ${cause}` : '';
    super(
      `Circular constant definition with dependency chain: \
${dependencyChain.map((c) => JSON.stringify(c)).join(' -> ')}!\
${causeMessage}`,
      { constName, cause },
    );

    this.dependencyChain = dependencyChain;
  }
}

export class UnexpectedTrailingExpressionError extends InvalidExpressionError {}

export class InternalInterpreterError extends CalculableSvgError {}

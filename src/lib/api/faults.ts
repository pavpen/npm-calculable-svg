import {
  calculateAttrXPath,
  calculateElementXPath,
} from '../private/xpath-helpers';

export class CalculableSvgError extends Error {
  add_note(note: string): this {
    this.message = `${this.message}\n${note}`;
    return this;
  }
}

export class InvalidStringValueError extends CalculableSvgError {
  readonly value: string | null;
  readonly allowedValues: Iterable<string | null> | undefined;
  readonly allowedValuesDescirption: string | undefined;

  constructor(
    message: string,
    {
      value,
      allowedValues,
      allowedValuesDescription,
    }: {
      value: string | null;
      allowedValues?: Iterable<string | null> | undefined;
      allowedValuesDescription?: string | undefined;
    },
  ) {
    super(message);
    this.value = value;
    this.allowedValues = allowedValues;
    this.allowedValuesDescirption = allowedValuesDescription;
  }
}

export class InvalidAttributeValueError extends InvalidStringValueError {
  readonly attributename: string;
  readonly namespaceUri: string | undefined;

  constructor({
    attributeName,
    namespaceUri,
    value,
    allowedValues,
    allowedValuesDescription,
  }: {
    attributeName: string;
    namespaceUri: string | undefined;
    value: string | null;
    allowedValues?: Iterable<string | null> | undefined;
    allowedValuesDescription?: string | undefined;
  }) {
    const namespaceMessage = namespaceUri
      ? ` in XML namespace ${JSON.stringify(namespaceUri)}`
      : '';
    const allowedValuesMessage = `Allowed values: \
${allowedValuesDescription ?? ''}\
${allowedValuesDescription && allowedValues ? ': ' : ''}\
${typeof allowedValues === 'undefined' ? '' : JSON.stringify(allowedValues)}`;
    super(
      `Invalid value (${JSON.stringify(value)}) for attribute \
${JSON.stringify(attributeName)}${namespaceMessage}!  \
${allowedValuesMessage}`,
      { value, allowedValues, allowedValuesDescription },
    );

    this.attributename = attributeName;
    this.namespaceUri = namespaceUri;
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

export class InvalidExpressionError extends CalculableSvgError {
  readonly cause: Error | undefined;

  constructor(
    message: string,
    {
      cause,
    }: {
      cause?: Error | undefined;
    },
  ) {
    super(message);

    this.cause = cause;
  }
}

export class InvalidJinjaExpressionError extends InvalidExpressionError {
  readonly expressionString: string;

  constructor({
    expressionString,
    cause,
  }: {
    expressionString: string;
    cause: Error;
  }) {
    super(
      `Invalid Jinja expression ${JSON.stringify(expressionString)}: ${cause}`,
      { cause },
    );

    this.expressionString = expressionString;
  }
}

export class InvalidId extends InvalidExpressionError {}

export class InvalidAttributeExpressionError extends InvalidExpressionError {
  readonly expressionString: string;
  readonly expressionDefinitionAttribute: Attr;

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
      { cause },
    );

    this.expressionString = expressionString;
    this.expressionDefinitionAttribute = expressionDefinitionAttribute;
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
      { cause },
    );

    this.constName = constName;
  }
}

export class InvalidConstantExpressionError extends InvalidExpressionError {
  readonly constName: unknown;

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
    super(message, { cause });

    this.constName = constName;
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

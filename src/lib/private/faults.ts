import { InvalidExpressionError } from '../api/faults';
import type { GetElementPropertyExpression } from './get-element-property-expresion';

export class InvalidGetElementPropertyExpressionError extends InvalidExpressionError {
  readonly expression: GetElementPropertyExpression;

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
      { cause },
    );

    this.expression = expression;
  }
}

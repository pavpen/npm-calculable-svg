import * as huggingface_jinja from '@huggingface/jinja';
import {
  InternalInterpreterError,
  InvalidExpressionError,
  UnexpectedTrailingExpressionError,
} from './faults';

export interface JinjaEvaluationScope extends huggingface_jinja.Environment {}

export type JinjaInterpreterValue = ReturnType<
  typeof huggingface_jinja.Interpreter.prototype.evaluate
>;

export type JinjaInterpreterParameterValue =
  | string
  | number
  | boolean
  | object
  | null
  | undefined;

const interpreterToJavaScriptValue: (
  value: JinjaInterpreterValue,
) => string | number | boolean | object | null | undefined = (value) => {
  if (value.type === 'ObjectValue') {
    const resultObject: Record<
      string,
      string | number | boolean | object | null | undefined
    > = {};

    for (const [propertyName, propertyValue] of (
      value.value as Map<string, JinjaInterpreterValue>
    ).entries()) {
      if (propertyName in resultObject) {
        throw new InvalidExpressionError(
          `Result object has disallowed property named: ${JSON.stringify(propertyName)}`,
        );
      }
      resultObject[propertyName] = interpreterToJavaScriptValue(propertyValue);
    }
    return resultObject;
  }

  return value.value;
};

/**
 * An implementation that provides evaluation of Jinja expressions
 *
 * Provides an interface that decouples user code from a specific Jinja
 * engine.
 */
export class JinjaEvaluator {
  createGlobalScope(variables: Record<string, unknown>): JinjaEvaluationScope {
    const result = new huggingface_jinja.Environment();

    for (const [name, value] of Object.entries(variables)) {
      result.set(name, value);
    }

    return result;
  }

  /**
   * Returns a value that was encoded for use by a Jinja interpreter when
   * passing parameters converted to its usual JavaScript representation
   *
   * For example, the '@huggingface/jinja' NPM package represents plain
   * JavaScript objects passed to functions as `Map` objects.  Without using
   * this method to convert them back to a plain object, passing them to
   * native functions and methods, such as
   * `SVGGraphicsElement.getBBox(options)`, would fail.
   */
  interpreterParameterToJavaScriptValue(value: JinjaInterpreterParameterValue) {
    if (value instanceof Map) {
      const resultObject: Record<
        string,
        string | number | boolean | object | null | undefined
      > = {};

      for (const [propertyName, propertyValue] of (
        value as Map<string, JinjaInterpreterValue>
      ).entries()) {
        if (typeof propertyName !== 'string' || propertyName in resultObject) {
          throw new InvalidExpressionError(
            `Result object has disallowed property named: ${JSON.stringify(propertyName)}`,
          );
        }
        resultObject[propertyName] =
          interpreterToJavaScriptValue(propertyValue);
      }
      return resultObject;
    }

    return value;
  }

  expandString(
    expressionString: string,
    globalScope: JinjaEvaluationScope,
  ): string {
    const program = huggingface_jinja.parse(
      huggingface_jinja.tokenize(expressionString),
    );

    const interpreter = new huggingface_jinja.Interpreter(globalScope);
    const result: {
      value: number | object | string | boolean | null | undefined;
      type: string;
    } = interpreter.run(program);
    const resultValue = result.value;
    const acceptedResultTypes = ['string', 'number'];

    if (typeof resultValue !== 'string' && typeof resultValue !== 'number') {
      throw new InternalInterpreterError(
        `Unexpected Jinja expression result type: ${result.type}!  Accepted types \
        are ${JSON.stringify(acceptedResultTypes)}.`,
      );
    }

    return resultValue.toString();
  }

  eval(expressionString: string, globalScope: JinjaEvaluationScope): unknown {
    // Unfortunately, "@huggingface/jinja" doesn't seem to expose parsing
    // individual expressions:
    const program = huggingface_jinja.parse(
      huggingface_jinja.tokenize(`{{ ${expressionString} }}`),
    );

    if (program.body.length < 1) {
      throw new InvalidExpressionError(
        `Unexpected empty expression: ${JSON.stringify(expressionString)}`,
      );
    }
    if (program.body.length > 1) {
      throw new UnexpectedTrailingExpressionError(
        `Unexpected trailing expression in: ${JSON.stringify(expressionString)}!`,
      );
    }

    const interpreter = new huggingface_jinja.Interpreter(globalScope);
    const result: JinjaInterpreterValue = interpreter.evaluate(
      program.body[0],
      globalScope,
    );

    return interpreterToJavaScriptValue(result);
  }
}

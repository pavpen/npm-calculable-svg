import type { JinjaEvaluationState } from '../../private/jinja-evaluation-state';

export const ExpressionLanguageValues = {
  Jinja: 1,
} as const;

export type ExpressionLanguage =
  (typeof ExpressionLanguageValues)[keyof typeof ExpressionLanguageValues];

const expressionLanguageValueToName: Map<ExpressionLanguage, string> = new Map(
  Object.entries(ExpressionLanguageValues).map(([name, value]) => [
    value,
    name,
  ]),
);

export const ExpressionLanguage = {
  ...ExpressionLanguageValues,
  getNameForValue(value: ExpressionLanguage): string {
    const result = expressionLanguageValueToName.get(value);

    if (typeof result === 'undefined') {
      throw Error(`Unrecognized enum value: ${value}!`);
    }

    return result;
  },
} as const;

/**
 * What expression must be evaluated in order to obtain the value of a
 * CSVG attribute, or constant
 *
 * > [!WARNING]
 * > This type is for package internal, and debug use.  It's API is not
 * > stable, even across minor release versions.  Avoid use in production code.
 *
 * @internal;
 */
export interface CalculationExpression {
  readonly sourceCode: string;
  readonly language: ExpressionLanguage;

  evaluateStringExpression(jinjaEvaluationState: JinjaEvaluationState): unknown;
}

export interface ElementCalculationExpression extends CalculationExpression {
  /**
   * The `Element` (such as `<csvg:const/>`) where the expression was
   * defined
   */
  readonly sourceElement: Element;
}

export interface AttrCalculationExpression extends CalculationExpression {
  /**
   * The XML `Attr` (e.g., `expr:d` in `<path expr:d="M0,0 h10"/>`) where
   * the expression was defined
   */
  readonly sourceAttr: Attr;
}

export namespace calculation_expression {
  export const forJinjaElement = (
    sourceElement: Element,
  ): ElementCalculationExpression =>
    new ElementJinjaCalculationExpression(sourceElement);
  export const forJinjaAttr = (sourceAttr: Attr): AttrCalculationExpression =>
    new AttrJinjaCalculationExpression(sourceAttr);
}

class ElementJinjaCalculationExpression
  implements ElementCalculationExpression
{
  constructor(readonly sourceElement: Element) {}

  get sourceCode(): string {
    return this.sourceElement.textContent;
  }

  get language(): typeof ExpressionLanguage.Jinja {
    return ExpressionLanguage.Jinja;
  }

  evaluateStringExpression(
    jinjaEvaluationState: JinjaEvaluationState,
  ): unknown {
    return jinjaEvaluationState.jinjaEvaluator.eval(
      this.sourceCode,
      jinjaEvaluationState.jinjaGlobalScope,
    );
  }
}

class AttrJinjaCalculationExpression implements AttrCalculationExpression {
  constructor(readonly sourceAttr: Attr) {}

  get sourceCode(): string {
    return this.sourceAttr.value;
  }

  get language(): typeof ExpressionLanguage.Jinja {
    return ExpressionLanguage.Jinja;
  }

  evaluateStringExpression(
    jinjaEvaluationState: JinjaEvaluationState,
  ): unknown {
    return jinjaEvaluationState.jinjaEvaluator.eval(
      this.sourceCode,
      jinjaEvaluationState.jinjaGlobalScope,
    );
  }
}

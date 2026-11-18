import type { JinjaEvaluationState } from '../../private/jinja-evaluation-state';
import { calculateAttrXPath } from '../../private/xpath-helpers';
import {
  InvalidAttributeExpressionError,
  InvalidStringValueError,
} from '../faults';
import {
  type AttrCalculationExpression,
  type CalculationExpression,
  ExpressionLanguage,
} from './calculation-expression';
import { DocumentEvaluationInformation } from './document-evaluation-information';

/**
 * What expression must be evaluated in order to obtain the value of a
 * CSVG attribute
 *
 * > [!WARNING]
 * > This type is for package internal, and debug use.  It's API is not
 * > stable, even across minor release versions.  Avoid use in production code.
 *
 * @internal
 */
export class AttributeCalculationDefinition implements CalculationExpression {
  /**
   * The `Attr` that defines the name of the constant output by this
   * expression, or `undefined`, if the default output constant name is used
   *
   * The default output constant name is the local name of the attribute
   * which contains the expression source code.  This can be overridden,
   * e.g.
   * `<svg attr-name:viewbox="viewBox" attr-expr:viewbox="{{document.getConst('viewBox')}}"/>`.
   * This is useful when the SVG is may be parsed by a non-XML parser (such
   * as when it's embedded in HTML), and the casing of attribute names is
   * lost.
   */
  readonly nameAttr: Attr | undefined;

  private static validateOutputAttributeQualifiedNameOrThrow(
    outputAttributeQualifiedName: string,
    attrCalculationExpression: AttrCalculationExpression,
    evaluationInformation: DocumentEvaluationInformation,
  ): void {
    if (
      !evaluationInformation.isValidOutputAttributeQualifiedName(
        outputAttributeQualifiedName,
      )
    ) {
      const cause = new InvalidStringValueError(
        'Invalid output attribute qualified name!',
        {
          allowedValuesDescription:
            DocumentEvaluationInformation.attributeValidOutputQualifiedNameDescription,
          value: outputAttributeQualifiedName,
        },
      );
      throw new InvalidAttributeExpressionError({
        expressionString: attrCalculationExpression.sourceCode,
        expressionDefinitionAttribute: attrCalculationExpression.sourceAttr,
        cause,
      });
    }
  }

  constructor(
    readonly calculationExpression: AttrCalculationExpression,
    evaluationInformation: DocumentEvaluationInformation,
    nameAttr?: Attr | undefined,
  ) {
    if (nameAttr) {
      AttributeCalculationDefinition.validateOutputAttributeQualifiedNameOrThrow(
        nameAttr.value,
        calculationExpression,
        evaluationInformation,
      );
    }
    this.nameAttr = nameAttr;
  }

  get sourceAttr(): Attr {
    return this.calculationExpression.sourceAttr;
  }

  get sourceCode(): string {
    return this.calculationExpression.sourceCode;
  }

  get language(): ExpressionLanguage {
    return this.calculationExpression.language;
  }

  getOutputAttrName(
    evaluationInformation: DocumentEvaluationInformation,
  ): string {
    if (typeof this.nameAttr === 'undefined') {
      return evaluationInformation.getAttrLocalName(
        this.calculationExpression.sourceAttr,
      );
    }

    const result = this.nameAttr.value;
    AttributeCalculationDefinition.validateOutputAttributeQualifiedNameOrThrow(
      result,
      this.calculationExpression,
      evaluationInformation,
    );

    return result;
  }

  evaluateStringExpression(jinjaEvaluationState: JinjaEvaluationState): string {
    const sourceCode = this.sourceCode;
    let result: string;
    try {
      result = jinjaEvaluationState.jinjaEvaluator.renderTemplateString(
        sourceCode,
        jinjaEvaluationState.jinjaGlobalScope,
      );
    } catch (e) {
      throw new InvalidAttributeExpressionError({
        expressionString: sourceCode,
        expressionDefinitionAttribute: this.sourceAttr,
        cause: e as Error,
      });
    }

    return result;
  }

  toWebBuiltIns() {
    return {
      sourceAttr: this.sourceAttr,
      sourceCode: this.sourceCode,
      languageName: ExpressionLanguage.getNameForValue(this.language),
      nameAttr: this.nameAttr,
    };
  }

  toStringifiable() {
    return {
      sourceAttrPath: calculateAttrXPath(this.sourceAttr),
      sourceCode: this.sourceCode,
      languageName: ExpressionLanguage.getNameForValue(this.language),
      nameAttrPath: this.nameAttr && calculateAttrXPath(this.nameAttr),
    };
  }
}

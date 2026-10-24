import { CsvgDomRect as JsCsvgDomRect } from '../../api/csvg-dom-rect';
import { CsvgUsedStyleDimensions as JsCsvgUsedStyleDimensions } from '../../api/csvg-used-style-dimensions';
import type { EvaluationState } from '../../private/evaluation-helpers';
import { attribute_expression } from '../../private/expression-api/attribute-expression';
import type { CsvgElement } from '../csvg-element';
import { CsvgDomRectForEvaluation } from './csvg-dom-rect-for-evaluation';
import { CsvgUsedStyleDimensionsForEvaluation } from './csvg-used-style-dimensions-for-evaluation';

/**
 * A CsvgElement accessible to CSVG expressions
 */
export class CsvgElementForEvaluation {
  protected readonly element: Element;
  protected readonly evaluationState: EvaluationState;

  constructor(element: Element, evaluationState: EvaluationState) {
    this.element = element;
    this.evaluationState = evaluationState;
  }

  getAttribute(qualifiedName: string): string | null {
    // Satisfy attribute dependendencies, before reading the attribute value:
    const expressionAttribute =
      attribute_expression.expressionAttributeForOutputAttributeQualifiedName(
        this.element,
        qualifiedName,
        this.evaluationState.documentEvaluationInformation,
      );
    if (expressionAttribute !== null) {
      this.evaluationState.renderJinjaExpressionAttribute(expressionAttribute);
    }

    return this.element.getAttribute(qualifiedName);
  }

  getBoundingClientRect(): CsvgDomRectForEvaluation | undefined {
    this.evaluationState.renderElement(this.element);
    const boundingClientRect = this.element.getBoundingClientRect();
    this.evaluationState.addCurrentExpressionDependencyOnBoundingClientRect(
      this.element,
      new JsCsvgDomRect(boundingClientRect),
    );

    return new CsvgDomRectForEvaluation(boundingClientRect);
  }

  /**
   * Returns the dimension properties of the used style of this element
   *
   * * See
   *  [window.getComputedStyle() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)
   *  for the definitions of style 'used value', 'resolved value', and
   *   'computed value'.
   *
   * @param pseudoElementName CSS pseudo element, for which to get style
   *   properties.  E.g., `":hover"`.
   */
  getUsedStyleDimensions(
    pseudoElementName: string | null = null,
  ): CsvgUsedStyleDimensionsForEvaluation {
    const element = this.element;
    const usedStyle = window.getComputedStyle(element, pseudoElementName);

    this.evaluationState.addCurrentExpressionDependencyOnUsedStyleDimensions(
      element,
      pseudoElementName ?? '',
      new JsCsvgUsedStyleDimensions(usedStyle),
    );

    return new CsvgUsedStyleDimensionsForEvaluation(usedStyle);
  }

  toEvaluationObject(): CsvgElement {
    return {
      getAttribute: this.getAttribute,
      getBoundingClientRect: () =>
        this.getBoundingClientRect()?.toEvaluationObject(),
      getUsedStyleDimensions: (pseudoElementName: string | null = null) =>
        this.getUsedStyleDimensions(pseudoElementName).toEvaluationObject(),
    };
  }
}

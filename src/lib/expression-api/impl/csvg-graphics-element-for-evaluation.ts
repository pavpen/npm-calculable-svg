import { CsvgDomRect as JsCsvgDomRect } from '../../api/csvg-dom-rect';
import type { EvaluationState } from '../../private/evaluation-helpers';
import type { CsvgGraphicsElement } from '../csvg-graphics-element';
import { CsvgDomRectForEvaluation } from './csvg-dom-rect-for-evaluation';
import { CsvgElementForEvaluation } from './csvg-element-for-evaluation';

export class CsvgGraphicsElementForEvaluation extends CsvgElementForEvaluation {
  protected readonly element: SVGGraphicsElement;

  constructor(element: SVGGraphicsElement, evaluationState: EvaluationState) {
    super(element, evaluationState);
    this.element = element;
  }

  getBBox(): CsvgDomRectForEvaluation | undefined {
    const element = this.element;

    this.evaluationState.renderElement(element);
    const bbox = element.getBBox();
    this.evaluationState.addCurrentExpressionDependencyOnBBox(
      element,
      new JsCsvgDomRect(bbox),
    );

    return new CsvgDomRectForEvaluation(bbox);
  }

  toEvaluationObject(): CsvgGraphicsElement {
    return {
      ...super.toEvaluationObject(),
      getBBox: () => this.getBBox()?.toEvaluationObject(),
    };
  }
}

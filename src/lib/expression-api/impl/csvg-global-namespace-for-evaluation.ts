import type { EvaluationState } from '../../private/evaluation-state';
import type { CsvgGlobalNamespace } from '../csvg-global-namespace';
import { CsvgDocumentForEvaluation } from './csvg-document-for-evaluation';
import { MathNamespaceForEvaluation } from './math-namespace';

/**
 * The following symbols are defined in the global namespace accessible to
 * Jinja Calculable SVG expressions.
 */
export class CsvgGlobalNamespaceForEvaluation {
  toEvaluationObject(): CsvgGlobalNamespace {
    return {
      Math: new MathNamespaceForEvaluation().toEvaluationObject(),
      true: true,
      false: false,
      null: null,
      NaN: NaN,
      parseFloat: parseFloat,
      document: this.document.toEvaluationObject(),
    };
  }
  readonly document: CsvgDocumentForEvaluation;

  constructor(evaluationState: EvaluationState) {
    this.document = new CsvgDocumentForEvaluation(evaluationState);
  }
}

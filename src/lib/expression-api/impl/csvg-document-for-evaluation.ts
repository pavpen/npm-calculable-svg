import type { EvaluationState } from '../../private/evaluation-helpers';
import type { CsvgDocument } from '../csvg-document';
import type { CsvgElement } from '../csvg-element';
import type { ImmutableMap } from '../immutable-map';
import { CsvgElementForEvaluation } from './csvg-element-for-evaluation';
import { CsvgGraphicsElementForEvaluation } from './csvg-graphics-element-for-evaluation';

class DocLocalIdToElementMap
  implements ImmutableMap<string, CsvgElementForEvaluation>
{
  readonly #evaluationState: EvaluationState;

  constructor(evaluationState: EvaluationState) {
    this.#evaluationState = evaluationState;
  }

  get(key: string): CsvgElementForEvaluation | undefined {
    const element =
      this.#evaluationState.documentEvaluationInformation.getElementByDocLocalId(
        key,
      );

    if (!element) {
      return undefined;
    }

    return toElementForEvaluation(element, this.#evaluationState);
  }

  toEvaluationObject(): ImmutableMap<string, CsvgElement> {
    return {
      get: (key: string) => this.get(key)?.toEvaluationObject(),
    };
  }
}

const toElementForEvaluation = (
  element: Element,
  evaluationState: EvaluationState,
): CsvgElementForEvaluation => {
  if (element instanceof SVGGraphicsElement) {
    return new CsvgGraphicsElementForEvaluation(element, evaluationState);
  }
  return new CsvgElementForEvaluation(element, evaluationState);
};

/**
 * The CSVG document accessible to CSVG expressions (such as Jinja ones)
 *
 * This doesn't have all the features of the `CsvgDocument` available to the
 * SDK, outside of CSVG expressions.
 */
export class CsvgDocumentForEvaluation {
  /**
   * Maps an element's [`doc-local-id` attribute](#attribute-doc-local-id)
   * value to the corresponding {@link CsvgElementForEvaluation}
   */
  readonly localIdToElement: DocLocalIdToElementMap;

  readonly #evaluationState: EvaluationState;

  constructor(evaluationState: EvaluationState) {
    this.#evaluationState = evaluationState;
    this.localIdToElement = new DocLocalIdToElementMap(evaluationState);
  }

  /**
   * Returns the value of the constant named `id`.  Referencing an undefined
   * constant `id` is an error.
   *
   * See [Constant Jinja Expression](#constant-jinja-expression) for defining
   * constants.
   */
  getConst(name: string): unknown {
    return this.#evaluationState.renderConst(name);
  }

  toEvaluationObject(): CsvgDocument {
    return Object.freeze({
      getConst: (name: string) => this.getConst(name),
      localIdToElement: this.localIdToElement.toEvaluationObject(),
    });
  }
}

import type { CsvgElement } from './csvg-element';
import type { ImmutableMap } from './immutable-map';

/**
 * The CSVG document accessible to CSVG expressions (such as Jinja ones)
 *
 * This doesn't have all the features of the `CsvgDocument` available to the
 * SDK, outside of CSVG expressions.
 */
export interface CsvgDocument {
  /**
   * Returns the value of the constant named `id`.  Referencing an undefined
   * constant `id` is an error.
   *
   * See [Constant Jinja Expression](#constant-jinja-expression) for defining
   * constants.
   */
  getConst(name: string): unknown;

  /**
   * Maps an element's [`doc-local-id` attribute](#attribute-doc-local-id)
   * value to the corresponding {@link CsvgElement}
   */
  readonly localIdToElement: ImmutableMap<string, CsvgElement>;
}

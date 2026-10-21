import type { CsvgDocument } from './csvg-document';
import type { Math as MathNameSpace } from './math-namespace';

/**
 * The following symbols are defined in the global namespace accessible to
 * Jinja Calculable SVG expressions.
 */
export interface CsvgGlobalNamespace {
  /** Namespace containing algebraic operations */
  readonly Math: MathNameSpace;

  /** The `true` boolean constant */
  readonly true: boolean;

  /** The `false` boolean constant */
  readonly false: boolean;

  /** The `null` object constant */
  readonly null: null;

  /**
   * The floating-point not-a-number constant.
   *
   * See
   * [NaN in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN)
   * for arithmetic behavior.
   */
  readonly NaN: number;

  /**
   * Converts a string to a floating-point number, or NaN, if parsing fails.
   *
   * See
   * [parseFloat in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseFloat).
   */
  parseFloat(string: string): number;

  /**
   * The CSVG document being rendered
   */
  readonly document: CsvgDocument;
}

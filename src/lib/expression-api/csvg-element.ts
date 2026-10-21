import type { CsvgDomRect } from './csvg-dom-rect';
import type { CsvgUsedStyleDimensions } from './csvg-used-style-dimensions';

/**
 * A CsvgElement accessible to CSVG expressions
 */
export interface CsvgElement {
  getAttribute(qualifiedName: string): string | null;

  getBoundingClientRect(): CsvgDomRect | undefined;

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
    pseudoElementName: string | null,
  ): CsvgUsedStyleDimensions;
}

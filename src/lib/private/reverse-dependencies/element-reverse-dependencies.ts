import type { CsvgDomRect } from '../../api/csvg-dom-rect';
import type { CsvgUsedStyleDimensions } from '../../api/csvg-used-style-dimensions';
import { DocumentExpressionSet } from '../document-expression-set';

export class UsedStyleDimensionsReverseDependencies {
  lastUsedStyleDimensions: CsvgUsedStyleDimensions;
  readonly reverseDependencies: DocumentExpressionSet =
    new DocumentExpressionSet();

  constructor(lastUsedStyleDimensions: CsvgUsedStyleDimensions) {
    this.lastUsedStyleDimensions = lastUsedStyleDimensions;
  }

  toJsValue() {
    return {
      lastUsedStyleDimensions: this.lastUsedStyleDimensions.toObject(),
      reverseDependencies: this.reverseDependencies.toJsValue(),
    };
  }
}

/**
 * Keeps track of which attribute, and constant expressions are affected by an
 * element's property, such as a bounding box, or used style
 *
 * * Reverse dependencies don't include element style, or dimensions, such as
 *   a bounding box.  E.g., if an element's size affects another element's
 *   size, this dependency is not tracked here.
 */
export class ElementReverseDependencies {
  lastBBox: CsvgDomRect | null = null;
  readonly bboxReverseDependencies: DocumentExpressionSet =
    new DocumentExpressionSet();
  lastBoundingClientRect: CsvgDomRect | null = null;
  readonly boundingClientRectReverseDependencies: DocumentExpressionSet =
    new DocumentExpressionSet();
  readonly pseudoElementNameToUsedStyleDimensionDependencies: Map<
    string,
    UsedStyleDimensionsReverseDependencies
  > = new Map();

  clear() {
    this.bboxReverseDependencies.clear();
    this.lastBBox = null;
    this.boundingClientRectReverseDependencies.clear();
    this.lastBoundingClientRect = null;
    this.pseudoElementNameToUsedStyleDimensionDependencies.clear();
  }

  toJsValue() {
    return {
      lastBBox: this.lastBBox?.toObject(),
      bboxReverseDependencies: this.bboxReverseDependencies.toJsValue(),
      lastBoundingClientRect: this.lastBoundingClientRect?.toObject(),
      boundingClientRectReverseDependencies:
        this.boundingClientRectReverseDependencies.toJsValue(),
      pseudoElementNameToUsedStyleDimensionDependencies: Object.fromEntries(
        Array.from(
          this.pseudoElementNameToUsedStyleDimensionDependencies.entries(),
        ).map(([pseudoElementName, reverseDependencies]) => [
          pseudoElementName,
          reverseDependencies.toJsValue(),
        ]),
      ),
    };
  }
}

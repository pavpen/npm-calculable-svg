import { CsvgDomRect } from '../../api/csvg-dom-rect';
import type { CsvgUsedStyleDimensions } from '../../api/csvg-used-style-dimensions';
import { InternalInterpreterError } from '../../api/faults';
import { DocumentExpressionSet } from '../document-expression-set';
import { calculateElementXPath } from '../xpath-helpers';

export class UsedStyleDimensionsReverseDependencies {
  lastUsedStyleDimensions: CsvgUsedStyleDimensions;
  readonly reverseDependencies: DocumentExpressionSet =
    new DocumentExpressionSet();

  constructor(lastUsedStyleDimensions: CsvgUsedStyleDimensions) {
    this.lastUsedStyleDimensions = lastUsedStyleDimensions;
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      lastUsedStyleDimensions: this.lastUsedStyleDimensions.toObject(),
      reverseDependencies: this.reverseDependencies.toWebBuiltIns(),
    });
  }

  /**
   * Returns the instance represented as primitive types serializable by
   * `JSON.stringify` (Object, Array, string, number, boolean, undefined,
   * null)
   */
  toStringifiable() {
    return Object.freeze({
      lastUsedStyleDimensions: this.lastUsedStyleDimensions.toObject(),
      reverseDependencies: this.reverseDependencies.toStringifiable(),
    });
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

  calculateIsBBoxInvalidated(element: Element): boolean {
    if (!(element instanceof SVGGraphicsElement)) {
      throw new InternalInterpreterError(
        `Element has a recorded lastBBox used by CSVG expressions, but \
it's not instanceof SVGGraphicsElement (which defines the \`getBBox\` method)!  \
Element path: ${JSON.stringify(calculateElementXPath(element))}.`,
      );
    }

    const lastBBox = this.lastBBox;
    if (lastBBox === null) {
      console.assert(
        this.bboxReverseDependencies.isEmpty,
        `Element has no last calculated BBox value, but it has BBox reverse dependencies!  \
Element path: ${calculateElementXPath(element)}, \
reverse dependencies: ${JSON.stringify(this.toWebBuiltIns())}`,
      );

      return false;
    }

    const currentBBox = new CsvgDomRect(element.getBBox());

    const result = !currentBBox.equals(lastBBox);
    if (result) {
      console.debug('Element BBox has changed since last calculation.', {
        element,
        lastBBox,
        currentBBox,
      });
    }

    return result;
  }

  calculateIsBoundingClientRectInvalidated(element: Element): boolean {
    if (!(element instanceof Element)) {
      throw new InternalInterpreterError(
        `Element has a recorded lastBoundingClientRect used by CSVG \
expressions, but it's not instanceof SVGGraphicsElement (which defines the \
\`getBoundingClientRect\` method)!`,
      );
    }

    const lastBoundingClientRect = this.lastBoundingClientRect;

    if (lastBoundingClientRect === null) {
      console.assert(
        this.boundingClientRectReverseDependencies.isEmpty,
        `Element has no last calculated BoundingClientRect, but it has reverse dependencies!\
Element path: ${calculateElementXPath(element)}, \
reverse dependencies: ${JSON.stringify(this.boundingClientRectReverseDependencies.toWebBuiltIns())}`,
      );

      return false;
    }

    const currentBoundingClientRect = new CsvgDomRect(
      element.getBoundingClientRect(),
    );
    const result = !currentBoundingClientRect.equals(lastBoundingClientRect);
    if (result) {
      console.debug(
        'Element BoundingClientRect has changed since last calculation.',
        {
          element,
          lastBoundingClientRect,
          currentBoundingClientRect,
        },
      );
    }

    return result;
  }

  clear() {
    this.bboxReverseDependencies.clear();
    this.lastBBox = null;
    this.boundingClientRectReverseDependencies.clear();
    this.lastBoundingClientRect = null;
    this.pseudoElementNameToUsedStyleDimensionDependencies.clear();
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      lastBBox: this.lastBBox?.toObject(),
      bboxReverseDependencies: this.bboxReverseDependencies.toWebBuiltIns(),
      lastBoundingClientRect: this.lastBoundingClientRect?.toObject(),
      boundingClientRectReverseDependencies:
        this.boundingClientRectReverseDependencies.toWebBuiltIns(),
      pseudoElementNameToUsedStyleDimensionDependencies: Object.fromEntries(
        Array.from(
          this.pseudoElementNameToUsedStyleDimensionDependencies.entries(),
        ).map(([pseudoElementName, reverseDependencies]) => [
          pseudoElementName,
          reverseDependencies.toWebBuiltIns(),
        ]),
      ),
    });
  }

  /**
   * Returns the instance represented as primitive types serializable by
   * `JSON.stringify` (Object, Array, string, number, boolean, undefined,
   * null)
   */
  toStringifiable() {
    return Object.freeze({
      lastBBox: this.lastBBox?.toObject(),
      bboxReverseDependencies: this.bboxReverseDependencies.toStringifiable(),
      lastBoundingClientRect: this.lastBoundingClientRect?.toObject(),
      boundingClientRectReverseDependencies:
        this.boundingClientRectReverseDependencies.toWebBuiltIns(),
      pseudoElementNameToUsedStyleDimensionDependencies: Object.fromEntries(
        Array.from(
          this.pseudoElementNameToUsedStyleDimensionDependencies.entries(),
        ).map(([pseudoElementName, reverseDependencies]) => [
          pseudoElementName,
          reverseDependencies.toWebBuiltIns(),
        ]),
      ),
    });
  }
}

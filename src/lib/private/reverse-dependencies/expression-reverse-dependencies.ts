import { DocumentExpressionSet } from '../document-expression-set';

/**
 * Keeps track of which attribute, and constant expressions are affected by a
 * given expression.
 *
 * * Reverse dependencies don't include element style, or dimensions, such as
 *   a bounding box.  E.g., if an attribute expression affects an element's
 *   size, this dependency is not tracked here.
 */
export class ExpressionReverseDependencies {
  lastExpressionString: string;
  reverseDependencies: DocumentExpressionSet = new DocumentExpressionSet();

  constructor(lastExpressionString: string) {
    this.lastExpressionString = lastExpressionString;
  }

  /**
   * Returns the instance represented as JavaScript built-in data structures,
   * and types, such as Array, Map, Object, Date, Element, Attr
   */
  toWebBuiltIns() {
    return Object.freeze({
      lastExpressionString: this.lastExpressionString,
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
      lastExpressionString: this.lastExpressionString,
      reverseDependencies: this.reverseDependencies.toStringifiable(),
    });
  }
}

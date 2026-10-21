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

  toJsValue() {
    return {
      lastExpressionString: this.lastExpressionString,
      reverseDependencies: this.reverseDependencies.toJsValue(),
    };
  }
}

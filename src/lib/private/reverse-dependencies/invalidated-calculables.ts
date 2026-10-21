import { calculateAttrXPath, calculateElementXPath } from '../xpath-helpers';

export class InvalidatedCalculables {
  readonly constantNames: Set<string> = new Set();
  readonly expressionAttrs: Set<Attr> = new Set();
  readonly elements: Set<Element> = new Set();

  get isEmpty(): boolean {
    return (
      this.expressionAttrs.size < 1 &&
      this.constantNames.size < 1 &&
      this.elements.size < 1
    );
  }

  toObject() {
    return {
      constantNames: Array.from(this.constantNames),
      expressionAttrs: Array.from(this.expressionAttrs),
      elements: Array.from(this.elements),
    };
  }

  toDebugString(): string {
    return JSON.stringify({
      constantNames: Array.from(this.constantNames),
      expressionAttrXPaths: Array.from(this.expressionAttrs).map(
        calculateAttrXPath,
      ),
      elementXPaths: Array.from(this.elements).map(calculateElementXPath),
    });
  }
}

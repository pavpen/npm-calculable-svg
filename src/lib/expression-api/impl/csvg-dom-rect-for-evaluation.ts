import type { CsvgDomRect } from '../csvg-dom-rect';

/**
 * A rectangle associated with an element, such as a bounding box, or
 * [BoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)
 */
export class CsvgDomRectForEvaluation {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  constructor(value: DOMRect) {
    this.x = value.x;
    this.y = value.y;
    this.width = value.width;
    this.height = value.height;
  }

  equals(comparand: CsvgDomRect): boolean {
    return (
      this.x === comparand.x &&
      this.y === comparand.y &&
      this.width === comparand.width &&
      this.height === comparand.height
    );
  }

  toString(): string {
    return `{ x: ${this.x}, y: ${this.y}, width: ${this.width}, height: ${this.height} }`;
  }

  toEvaluationObject(): CsvgDomRect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      equals: (comparand: CsvgDomRectForEvaluation) => this.equals(comparand),
      toString: () => this.toString(),
    };
  }
}

/**
 * A rectangle associated with an element, such as a bounding box, or
 * [BoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)
 */
export interface CsvgDomRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  equals(comparand: CsvgDomRect): boolean;
  toString(): string;
}

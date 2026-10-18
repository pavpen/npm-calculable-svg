import { hash } from '../helpers/hashable';

export interface CsvgDomRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export class ComparableCsvgDomRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  private cachedHashCode: number | undefined;

  constructor(value: DOMRect) {
    this.x = value.x;
    this.y = value.y;
    this.width = value.width;
    this.height = value.height;
  }

  toObject(): CsvgDomRect {
    return Object.freeze({
      ...this,
    });
  }

  equals(comparand: ComparableCsvgDomRect): boolean {
    return (
      this.x === comparand.x &&
      this.y === comparand.y &&
      this.width === comparand.width &&
      this.height === comparand.height
    );
  }

  get hashCode(): number {
    let result = this.cachedHashCode;

    if (typeof result === 'undefined') {
      result = hash.non_crypto.combineHashCodes(
        this.x,
        this.y,
        this.width,
        this.height,
      );
      this.cachedHashCode = result;
    }

    return result;
  }

  toString(): string {
    return `{ x: ${this.x}, y: ${this.y}, width: ${this.width}, height: ${this.height} }`;
  }
}

import { CsvgDomRectForEvaluation as CsvgDomRectForExpressions } from '../expression-api/impl/csvg-dom-rect-for-evaluation';
import { hash } from '../private/helpers/hashable';

export interface CsvgDomRectProperties {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export class CsvgDomRect extends CsvgDomRectForExpressions {
  private cachedHashCode: number | undefined;

  toObject(): CsvgDomRectProperties {
    return Object.freeze({
      ...this,
    });
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
}

import { CsvgUsedStyleDimensionsForEvaluation } from '../expression-api/impl/csvg-used-style-dimensions-for-evaluation';
import { hash } from '../private/helpers/hashable';

export interface CsvgUsedStyleDimensionsProperties {
  readonly leftPx: number | string;
  readonly rightPx: number | string;
  readonly topPx: number | string;
  readonly bottomPx: number | string;
  readonly widthPx: number | string;
  readonly heightPx: number | string;
  readonly marginLeftPx: number | string;
  readonly marginRightPx: number | string;
  readonly marginTopPx: number | string;
  readonly marginBottomPx: number | string;
  readonly paddingLeftPx: number | string;
  readonly paddingRightPx: number | string;
  readonly paddingTopPx: number | string;
  readonly paddingBottomPx: number | string;
  readonly textIndentPx: number | string;
  readonly fontSizePx: number | string;
  readonly strokeWidthPx: number | string;
}

export class CsvgUsedStyleDimensions extends CsvgUsedStyleDimensionsForEvaluation {
  private cachedHashCode: number | undefined;

  toObject(): CsvgUsedStyleDimensionsProperties {
    return Object.freeze({
      ...this,
    });
  }

  get hashCode(): number {
    let result = this.cachedHashCode;

    if (typeof result === 'undefined') {
      result = hash.non_crypto.combineHashCodes(
        propertyHashCode(this.leftPx),
        propertyHashCode(this.rightPx),
        propertyHashCode(this.topPx),
        propertyHashCode(this.bottomPx),
        propertyHashCode(this.widthPx),
        propertyHashCode(this.heightPx),
        propertyHashCode(this.marginLeftPx),
        propertyHashCode(this.marginRightPx),
        propertyHashCode(this.marginTopPx),
        propertyHashCode(this.marginBottomPx),
        propertyHashCode(this.paddingLeftPx),
        propertyHashCode(this.paddingRightPx),
        propertyHashCode(this.paddingTopPx),
        propertyHashCode(this.paddingBottomPx),
        propertyHashCode(this.textIndentPx),
        propertyHashCode(this.fontSizePx),
        propertyHashCode(this.strokeWidthPx),
      );

      this.cachedHashCode = result;
    }

    return result;
  }

  toString(): string {
    return JSON.stringify(this.toObject());
  }
}

const propertyHashCode = (value: number | string): number =>
  typeof value === 'number' ? value : hash.non_crypto.hashCodeForString(value);

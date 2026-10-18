import { hash } from '../helpers/hashable';

export interface CsvgUsedStyleDimensions {
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

export class ComparableCsvgUsedStyleDimensions {
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
  private cachedHashCode: number | undefined;

  constructor(style: CSSStyleProperties) {
    this.leftPx = parseCssFloatProprty(style.left);
    this.rightPx = parseCssFloatProprty(style.right);
    this.topPx = parseCssFloatProprty(style.top);
    this.bottomPx = parseCssFloatProprty(style.bottom);
    this.widthPx = parseCssFloatProprty(style.width);
    this.heightPx = parseCssFloatProprty(style.height);
    this.marginLeftPx = parseCssFloatProprty(style.marginLeft);
    this.marginRightPx = parseCssFloatProprty(style.marginRight);
    this.marginTopPx = parseCssFloatProprty(style.marginTop);
    this.marginBottomPx = parseCssFloatProprty(style.marginBottom);
    this.paddingLeftPx = parseCssFloatProprty(style.paddingLeft);
    this.paddingRightPx = parseCssFloatProprty(style.paddingRight);
    this.paddingTopPx = parseCssFloatProprty(style.paddingTop);
    this.paddingBottomPx = parseCssFloatProprty(style.paddingBottom);
    this.textIndentPx = parseCssFloatProprty(style.textIndent);
    this.fontSizePx = parseCssFloatProprty(style.fontSize);
    this.strokeWidthPx = parseCssFloatProprty(style.strokeWidth);
  }

  toObject(): CsvgUsedStyleDimensions {
    return Object.freeze({
      ...this,
    });
  }

  equals(comparand: ComparableCsvgUsedStyleDimensions): boolean {
    return (
      this.leftPx === comparand.leftPx &&
      this.rightPx === comparand.rightPx &&
      this.topPx === comparand.topPx &&
      this.bottomPx === comparand.bottomPx &&
      this.widthPx === comparand.widthPx &&
      this.heightPx === comparand.heightPx &&
      this.marginLeftPx === comparand.marginLeftPx &&
      this.marginRightPx === comparand.marginRightPx &&
      this.marginTopPx === comparand.marginTopPx &&
      this.marginBottomPx === comparand.marginBottomPx &&
      this.paddingLeftPx === comparand.paddingLeftPx &&
      this.paddingRightPx === comparand.paddingRightPx &&
      this.paddingTopPx === comparand.paddingTopPx &&
      this.paddingBottomPx === comparand.paddingBottomPx &&
      this.textIndentPx === comparand.textIndentPx &&
      this.fontSizePx === comparand.fontSizePx &&
      this.strokeWidthPx === comparand.strokeWidthPx
    );
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

const parseCssFloatProprty: (propertyValue: string) => number | string = (
  propertyValue,
) => {
  const result = parseFloat(propertyValue);

  return Number.isNaN(result) ? propertyValue : result;
};

const propertyHashCode = (value: number | string): number =>
  typeof value === 'number' ? value : hash.non_crypto.hashCodeForString(value);

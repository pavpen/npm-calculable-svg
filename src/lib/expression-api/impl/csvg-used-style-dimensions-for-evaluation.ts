import type { CsvgUsedStyleDimensions } from '../csvg-used-style-dimensions';

/**
 * CsvgElement style properties that represent dimensions, accessible to CSVG
 * expressions
 */
export class CsvgUsedStyleDimensionsForEvaluation {
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

  equals(comparand: CsvgUsedStyleDimensions): boolean {
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

  toString(): string {
    return JSON.stringify({
      ...this,
    });
  }

  toEvaluationObject(): CsvgUsedStyleDimensions {
    return {
      leftPx: this.leftPx,
      rightPx: this.rightPx,
      topPx: this.topPx,
      bottomPx: this.bottomPx,
      widthPx: this.widthPx,
      heightPx: this.heightPx,
      marginLeftPx: this.marginLeftPx,
      marginRightPx: this.marginRightPx,
      marginTopPx: this.marginTopPx,
      marginBottomPx: this.marginBottomPx,
      paddingLeftPx: this.paddingLeftPx,
      paddingRightPx: this.paddingRightPx,
      paddingTopPx: this.paddingTopPx,
      paddingBottomPx: this.paddingBottomPx,
      textIndentPx: this.textIndentPx,
      fontSizePx: this.fontSizePx,
      strokeWidthPx: this.strokeWidthPx,
      equals: this.equals,
      toString: this.toString,
    };
  }
}

const parseCssFloatProprty: (propertyValue: string) => number | string = (
  propertyValue,
) => {
  const result = parseFloat(propertyValue);

  return Number.isNaN(result) ? propertyValue : result;
};

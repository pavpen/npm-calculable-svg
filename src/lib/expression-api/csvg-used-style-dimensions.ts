/**
 * CsvgElement style properties that represent dimensions, accessible to CSVG
 * expressions
 */
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

  equals(comparand: CsvgUsedStyleDimensions): boolean;

  toString(): string;
}

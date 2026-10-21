import type { CsvgDomRect } from './csvg-dom-rect';
import type { CsvgElement } from './csvg-element';

export interface CsvgGraphicsElement extends CsvgElement {
  getBBox(): CsvgDomRect | undefined;
}

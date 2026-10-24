/**
 * @import { expression_api } from './index';
 *
 * Including this module in a browser document (e.g., as a `<script/>`
 * element) causes Calculable SVG expressions contained in
 * [SVGElement](https://developer.mozilla.org/en-US/docs/Web/API/SVGElement)
 * DOM sub-trees to be resolved.
 *
 * Expression resolution is described in {@link expression_api}.
 *
 * @module
 */

import * as calculable_svg from './index';

const processCurrentDocument = (): void => {
  calculable_svg.processDocument(document);
};

if (document.readyState === 'loading') {
  window.addEventListener('load', processCurrentDocument, { once: true });

  console.debug('Will evaluate current CSVG document when loaded.');
} else {
  processCurrentDocument();
}

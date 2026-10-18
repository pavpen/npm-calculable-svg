/**
 * Including this module in an SVG document (e.g., as a `<script/>` element)
 * causes Calculable SVG expressions to be resolved.
 *
 * Expression resolution is described [the README](../README.md).
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

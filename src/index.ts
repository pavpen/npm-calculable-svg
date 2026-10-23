/**
 * The Calculable SVG SDK allows rendering CSVG documents from TypeScript, and
 * JavaScirpt
 *
 * See {@link expression_api} for the syntax of Calculable SVG documents.
 *
 * @packageDocumentation
 */

import { CsvgDocument } from './lib/api/csvg-document';

export * from './lib/api';
export * as expression_api from './lib/expression-api';

/**
 * Renders a Calculable SVG document by evaluating expressions, and starts
 * live update (if enabled by document configuration attributes)
 *
 * @param document the CSVG document to render, and start updating live
 */
export const processDocument = (document: Document): void => {
  const csvgDocument = new CsvgDocument(document);

  csvgDocument.render();
};

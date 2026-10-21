import { CsvgDocument } from './lib/api/csvg-document';

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

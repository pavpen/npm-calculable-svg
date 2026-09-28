import { CsvgDocument } from './lib/csvg-document';

export const showDocumentDebugInformation = (document: Document): void => {
  const csvgDocument = new CsvgDocument(document);

  csvgDocument.showDebugInformation();
};

export const processDocument = (document: Document): void => {
  const csvgDocument = new CsvgDocument(document);

  csvgDocument.render();
};

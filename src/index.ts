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
export * as xml_api from './lib/xml-api';

/**
 * Renders a Calculable SVG document by evaluating expressions, and starts
 * live update (if enabled by document configuration attributes)
 *
 * @param document the CSVG document to render, and start updating live
 */
export const processDocument = (document: Document): void => {
  const treeWalker = document.createTreeWalker(
    document,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        const element = node as Element;

        if (isCsvgElement(element)) {
          return NodeFilter.FILTER_ACCEPT;
        }

        // Don't descend into `<svg/>` elements:
        if (element.parentElement?.tagName === 'svg') {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip non-matching elements from the output, but process their
        // descendents:
        return NodeFilter.FILTER_SKIP;
      },
    },
  );

  while (treeWalker.nextNode()) {
    const svgElement = treeWalker.currentNode as SVGElement;
    const csvgDocument = CsvgDocument.forSvgElement(svgElement);

    csvgDocument.render();
  }
};

const isCsvgElement = (element: Element): boolean => {
  if (element.tagName !== 'svg') {
    return false;
  }

  for (const attribute of element.attributes) {
    if (attribute.name === 'xmlns' || attribute.name.startsWith('xmlns:')) {
      return true;
    }
  }

  return false;
};

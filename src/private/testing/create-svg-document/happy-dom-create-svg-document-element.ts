import * as happy_dom from 'happy-dom';

export const happyDomCreateSvgDocumentElement = (
  outerHTML: string,
  window?: happy_dom.Window | undefined,
): SVGSVGElement => {
  const pageWindow = window ?? new happy_dom.Window();
  const document = new pageWindow.DOMParser().parseFromString(
    outerHTML,
    'image/svg+xml',
  );
  return document.documentElement as unknown as SVGSVGElement;
};

export const happyDomCreateHtmlDocument = (
  outerHTML: string,
  window?: happy_dom.Window | undefined,
): happy_dom.Document => {
  const pageWindow = window ?? new happy_dom.Window();
  const document = new pageWindow.DOMParser().parseFromString(
    outerHTML,
    'text/html',
  );

  return document;
};

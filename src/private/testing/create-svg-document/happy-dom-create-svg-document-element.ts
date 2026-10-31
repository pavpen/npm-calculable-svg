import { Window } from 'happy-dom';

export const happyDomCreateSvgDocumentElement = (
  outerHTML: string,
  window?: Window | undefined,
): SVGSVGElement => {
  const pageWindow = window ?? new Window();
  const document = new pageWindow.DOMParser().parseFromString(
    outerHTML,
    'image/svg+xml',
  );
  return document.documentElement as unknown as SVGSVGElement;
};

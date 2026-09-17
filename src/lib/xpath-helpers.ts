export const calculateElementXPath = (element: Element): string => {
  const elementId = element.getAttribute('id');

  if (elementId) {
    return `//${element.tagName}[@id=${JSON.stringify(elementId)}]`;
  }

  const parentNode = element.parentNode;

  if (!parentNode || parentNode.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const elementTagName = element.tagName.toLocaleLowerCase();
  let sameTagSiblingCount = 0;
  let sameTagSiblingIndex: number | undefined;
  for (const node of parentNode.children) {
    if (node.tagName.toLocaleLowerCase() !== elementTagName) {
      continue;
    }
    ++sameTagSiblingCount;
    if (node === element) {
      sameTagSiblingIndex = sameTagSiblingCount;
    }
  }
  if (sameTagSiblingCount > 1) {
    if (typeof sameTagSiblingIndex !== 'number') {
      throw new Error(`Element not found amoung the children of its parent!`);
    }
    return `${calculateElementXPath(parentNode as Element)}/${element.tagName}[${sameTagSiblingIndex + 1}]`;
  } else {
    return `${calculateElementXPath(parentNode as Element)}/${element.tagName}`;
  }
};

export const calculateAttrXPath = (attr: Attr): string => {
  const ownerElement = attr.ownerElement;

  if (ownerElement === null) {
    throw new Error(
      `Unable to calculate XPath for an Attr, not attached to an element: \
${attr}`,
    );
  }

  return `${calculateElementXPath(ownerElement)}/@${attr.name}`;
};

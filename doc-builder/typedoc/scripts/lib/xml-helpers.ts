export const escapeXmlAttributeValue = (value: string): string =>
  value.replaceAll(
    /[&<>"']/g,
    (matchedString) =>
      new Map([
        ['&', '&amp;'],
        ['<', '&lt;'],
        ['>', '&gt;'],
        ['"', '&quot;'],
        ["'", '&apos;'],
      ]).get(matchedString) ?? matchedString,
  );

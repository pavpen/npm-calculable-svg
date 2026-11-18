// @rstest-environment happy-dom
import { describe, expect, test } from '@rstest/core';
import { calculateElementXPath } from '../../../src/lib/private/xpath-helpers';
import {
  happyDomCreateHtmlDocument,
  happyDomCreateSvgDocumentElement,
} from '../../../src/private/testing/create-svg-document/happy-dom-create-svg-document-element';

describe(calculateElementXPath.name, async () => {
  test('calculates a root element path', () => {
    // Setup:
    const document = happyDomCreateHtmlDocument(`\
<!DOCTYPE html>
<html>
<head></head>

<body>
</body>

</html>\
`);

    // Act and verify:
    expect(
      calculateElementXPath(document.documentElement as unknown as Element),
    ).toEqual('//');
  });

  test('calculates a first sibling path', () => {
    // Setup:
    const svgElement = happyDomCreateSvgDocumentElement(`\
<svg xmlns="http://www.w3.org/2000/svg">
    <title>Unit test sample that has a dependency between constants</title>
    <g>
        <ellipse/>
        <ellipse/>
    </g>
</svg>\
`);

    // Act and verify:
    expect(
      calculateElementXPath(svgElement.getElementsByTagName('ellipse')[0]),
    ).toEqual('//g/ellipse[1]');
  });

  test('calculates a second sibling path', () => {
    // Setup:
    const svgElement = happyDomCreateSvgDocumentElement(`\
<svg xmlns="http://www.w3.org/2000/svg">
    <title>Unit test sample that has a dependency between constants</title>
    <g>
        <ellipse/>
        <ellipse/>
    </g>
</svg>\
`);

    // Act and verify:
    expect(
      calculateElementXPath(svgElement.getElementsByTagName('ellipse')[1]),
    ).toEqual('//g/ellipse[2]');
  });

  test('calculates path to element with `id`', () => {
    // Setup:
    const svgElement = happyDomCreateSvgDocumentElement(`\
<svg xmlns="http://www.w3.org/2000/svg">
    <title>Unit test sample that has a dependency between constants</title>
    <g>
        <ellipse/>
        <ellipse id="the-it"/>
    </g>
</svg>\
`);
    const element = svgElement.getElementById('the-it');
    if (element === null) {
      throw Error('Test element not found!');
    }

    // Act and verify:
    expect(calculateElementXPath(element)).toEqual('//ellipse[@id="the-it"]');
  });
});
